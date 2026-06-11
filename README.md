# Plataforma de Gobernanza Corporativa (MVP)

Plataforma web segura para la gestión de comités y junta directiva: acceso
segmentado por cuerpo colegiado, documentos con **marca de agua dinámica**,
autenticación con **2FA (TOTP)**, y log de auditoría inmutable.

> **Stack:** Next.js 14 (App Router) · TypeScript · Prisma · SQLite (local) /
> PostgreSQL (producción) · Tailwind CSS · NextAuth v5.

---

## ✅ Qué incluye este MVP (núcleo funcional)

- **Autenticación email + contraseña + 2FA (TOTP)** con Google Authenticator.
  - Login en dos pasos, configuración obligatoria de 2FA en el primer acceso.
  - Contraseñas con `bcrypt` (cost 12), secreto TOTP cifrado con AES‑256‑GCM.
- **RBAC por cuerpo colegiado** (`lib/permissions.ts`): un usuario solo ve los
  comités a los que pertenece. La verificación se hace **en cada query**, no solo
  en el frontend. `SUPER_ADMIN` ve todo.
- **Gestión documental con marca de agua dinámica**: el endpoint
  `/api/documents/[id]/serve` procesa el PDF **en memoria** (nunca escribe el
  original a disco) y superpone una marca diagonal repetida con
  `"{nombre} — {fecha} {hora} — CONFIDENCIAL"`. Visor en navegador con
  `react-pdf` + capa CSS adicional.
- **Log de auditoría inmutable** (`/audit`) con filtros y exportación a CSV. Sin
  endpoints de UPDATE/DELETE.
- **Ciclo completo de reuniones**: crear sesión + agenda, convocar (asistencias +
  email best-effort), estados (Borrador→Convocada→En curso→Cerrada→Aprobada),
  asistencia con alerta de quórum, **votaciones nominativas** (auditor no vota,
  resultados solo al cerrar), y **editor de actas con Tiptap** con flujo de
  aprobación (solo presidente aprueba).
- **Módulo de IA (Claude / Anthropic)**: botón "Generar resumen con IA" en el acta
  y **búsqueda semántica** en lenguaje natural sobre los documentos del comité.
  Modelo `claude-sonnet-4-6`. Requiere `ANTHROPIC_API_KEY` (si falta, devuelve un
  mensaje claro sin romper la app).
- **Dashboard** corporativo con navegación por comité y **panel de administración**
  (solo super_admin): crear comités, crear usuarios y **gestionar membresías**
  (asignar/quitar miembros con su rol).
- **Headers de seguridad** (CSP, X-Frame-Options, nosniff) y **rate limiting** en
  el login.

### Para activar la IA

Pon tu clave de Anthropic en `.env`:

```env
ANTHROPIC_API_KEY="sk-ant-..."
```

Sin la clave, el resto de la plataforma funciona igual; solo el resumen de actas
y la búsqueda semántica quedan deshabilitados con un aviso.

### Fuera del alcance (fase 2, según la spec)

Integración con Microsoft Teams, firma digital externa (DocuSign/Certicámara),
app móvil nativa y SSO/SAML empresarial.

---

## 🚀 Ejecutar en local

Requisitos: **Node.js 20+** (probado con Node 24).

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env
# Genera un secreto y pégalo en NEXTAUTH_SECRET y AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Crear la base de datos local (SQLite) y sembrarla
npm run db:push
npm run db:seed

# 4. Arrancar
npm run dev
```

Abre <http://localhost:3000>. En el primer login cada usuario configura su 2FA.

### Usuarios de prueba (contraseña: `Demo1234!`)

| Email                     | Rol                          |
| ------------------------- | ---------------------------- |
| `superadmin@empresa.com`  | Super administrador          |
| `presidente@empresa.com`  | Presidente (Junta)           |
| `secretario@empresa.com`  | Secretario (sube documentos) |
| `miembro@empresa.com`     | Miembro (solo Junta)         |
| `auditor@empresa.com`     | Auditor                      |

> El usuario `miembro` **no** pertenece al Comité de Auditoría: úsalo para
> comprobar que el RBAC bloquea el acceso a comités ajenos.

### Scripts útiles

| Script             | Acción                               |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Servidor de desarrollo               |
| `npm run build`    | Build de producción                  |
| `npm run start`    | Servir el build                      |
| `npm run db:push`  | Sincroniza el schema con la BD       |
| `npm run db:seed`  | Siembra datos demo                   |
| `npm run db:studio`| Prisma Studio (explorar la BD)       |

---

## 🗄️ SQLite (local) ↔ PostgreSQL (producción) — automático

En local se usa **SQLite** (cero instalación). En producción, **PostgreSQL**.
El cambio es **automático**: el script `scripts/db-provider.mjs` ajusta el
`provider` del schema según la variable `DATABASE_PROVIDER` (por defecto
`sqlite`; en Railway se pone `postgresql`). No hay que editar el schema a mano.

Los enums se modelan como `String` y `metadata` como texto JSON, así que el
mismo schema es 100% portable entre ambos motores.

---

## ☁️ Desplegar en internet

👉 **Guía completa paso a paso:** [`DESPLIEGUE.md`](DESPLIEGUE.md)

Resumen: subes el repo a GitHub → en Railway *Deploy from GitHub repo* → agregas
el plugin **PostgreSQL** → defines las variables (`DATABASE_PROVIDER=postgresql`,
`DATABASE_URL=${{Postgres.DATABASE_URL}}`, `NEXTAUTH_SECRET`/`AUTH_SECRET`,
`NEXTAUTH_URL`/`AUTH_URL`, `AUTH_TRUST_HOST=true`) → generas el dominio. El
`railway.json` ya define el build y el arranque (`npm run start:prod`), que
**crea las tablas y siembra los datos demo automáticamente**.

Para que los **documentos** persistan, añade un **volumen** montado en
`/app/uploads` (ver `DESPLIEGUE.md` → Parte C). Alternativa para escala: S3
(`STORAGE_TYPE=s3`, implementar las ramas marcadas en `lib/storage.ts`).

### Usuarios demo (contraseña `Demo1234!`)

`superadmin@empresa.com` · `presidente@empresa.com` · `secretario@empresa.com`
· `miembro@empresa.com` · `auditor@empresa.com`. Cada uno configura su 2FA en el
primer inicio de sesión.

---

## 🔐 Notas de seguridad

- El `fileKey` de los documentos nunca se expone al cliente; los PDF se sirven
  por streaming desde el servidor con la marca de agua aplicada.
- El rate limiter del login es **en memoria** (`lib/ratelimit.ts`): sirve para un
  contenedor único. Si escalas a varias réplicas, cámbialo por
  `@upstash/ratelimit` + Redis.
- No es posible impedir totalmente las capturas de pantalla: la marca de agua
  embebida en el PDF existe precisamente para ese caso.

---

## 📁 Estructura

```
app/(auth)/         Login y configuración de 2FA
app/(dashboard)/    Dashboard, comités, documentos, auditoría, admin
app/api/            Endpoints (auth, 2fa, documents, audit)
components/         UI: Sidebar, DocumentViewer, UploadZone, ...
lib/                auth, prisma, permissions, watermark, storage, audit, ...
prisma/schema.prisma  Modelo de datos
middleware.ts       Protección de rutas + 2FA obligatorio
```
