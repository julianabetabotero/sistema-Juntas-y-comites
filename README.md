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
- **Dashboard** corporativo con navegación por comité y panel de administración
  (lista de usuarios y comités).
- **Headers de seguridad** (CSP, X-Frame-Options, nosniff) y **rate limiting** en
  el login.

### Para activar la IA

Pon tu clave de Anthropic en `.env`:

```env
ANTHROPIC_API_KEY="sk-ant-..."
```

Sin la clave, el resto de la plataforma funciona igual; solo el resumen de actas
y la búsqueda semántica quedan deshabilitados con un aviso.

### Pendiente para las siguientes iteraciones

CRUD completo de administración (crear comités, usuarios y membresías desde la
UI; hoy se hace vía seed) e integraciones de fase 2 (Teams, firma digital, SSO).

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

## 🗄️ Nota sobre SQLite → PostgreSQL

En local se usa **SQLite** (cero instalación). SQLite no soporta `enum`,
`@db.Text` ni `Json`, así que en `prisma/schema.prisma` los enums se modelan como
`String` (los valores válidos están en `lib/enums.ts`) y `metadata` como texto
JSON. **Este diseño es portable**: en PostgreSQL funciona igual, solo cambia el
`provider`. No hace falta reescribir el schema para producción.

---

## ☁️ Desplegar: GitHub + Railway

### Paso 1 — Subir a GitHub

```bash
# Dentro de la carpeta governance-platform/
git init
git add .
git commit -m "MVP plataforma de gobernanza corporativa"

# Crea un repo vacío en github.com (o con gh):
#   gh repo create governance-platform --private --source=. --remote=origin --push
# o manualmente:
git branch -M main
git remote add origin https://github.com/TU_USUARIO/governance-platform.git
git push -u origin main
```

> El `.gitignore` ya excluye `.env`, `node_modules`, la BD local y `/uploads`.
> **Nunca subas tu `.env`.**

### Paso 2 — Cambiar a PostgreSQL para producción

Edita `prisma/schema.prisma` y cambia el provider:

```prisma
datasource db {
  provider = "postgresql"   // antes: "sqlite"
  url      = env("DATABASE_URL")
}
```

Haz commit de ese cambio. (En local puedes seguir con SQLite en una rama, o
instalar Postgres local; para el despliegue lo importante es que `main` use
`postgresql`.)

### Paso 3 — Crear el proyecto en Railway

1. Entra a <https://railway.app> → **New Project** → **Deploy from GitHub repo**
   → elige tu repo.
2. En el proyecto, **+ New → Database → PostgreSQL**. Railway crea la base de
   datos y expone su URL.
3. En el **servicio web** (tu app), pestaña **Variables**, añade:

   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}   # referencia al plugin de Postgres
   NEXTAUTH_SECRET=<un secreto de 32+ chars>
   AUTH_SECRET=<el mismo secreto>
   NEXTAUTH_URL=https://<tu-app>.up.railway.app
   AUTH_URL=https://<tu-app>.up.railway.app
   AUTH_TRUST_HOST=true
   STORAGE_TYPE=s3            # ver nota de almacenamiento abajo
   ANTHROPIC_API_KEY=         # opcional (módulo IA)
   ```

   > Railway define `DATABASE_URL` automáticamente si referencias el plugin con
   > `${{Postgres.DATABASE_URL}}`.

4. **Build & Deploy settings** del servicio:
   - **Build command:** `npm run build`  (ya ejecuta `prisma generate`)
   - **Start command:** `npx prisma db push && npm run start`
     (el `db push` crea las tablas en Postgres en cada deploy; es idempotente).

5. (Una sola vez) Para sembrar datos demo en producción, abre la consola del
   servicio en Railway y ejecuta:

   ```bash
   npm run db:seed
   ```

6. Railway te dará una URL pública. Asegúrate de que `NEXTAUTH_URL`/`AUTH_URL`
   coincidan con ella y haz un redeploy.

### Paso 4 — Almacenamiento de documentos en producción ⚠️

El sistema de archivos de Railway es **efímero**: los archivos subidos a
`/uploads` se pierden en cada redeploy. Para producción usa **S3** (o un bucket
compatible):

1. Crea un bucket S3 y unas credenciales IAM.
2. Variables: `STORAGE_TYPE=s3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.
3. Implementa las ramas S3 en `lib/storage.ts` (hay marcadores) e instala
   `@aws-sdk/client-s3`.

Para una demo rápida puedes dejar `STORAGE_TYPE=local`, sabiendo que los
documentos no persisten entre despliegues.

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
