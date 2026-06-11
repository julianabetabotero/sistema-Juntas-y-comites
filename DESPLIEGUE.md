# 🚀 Publicar la plataforma en internet (GitHub + Railway)

Esta guía te lleva paso a paso a tener un **enlace público** (tipo
`https://tu-app.up.railway.app`) que **cualquiera puede abrir** desde su
computadora o celular.

> El proyecto ya quedó **listo para producción**: usa PostgreSQL en la nube,
> se configura solo (`railway.json`) y **siembra los usuarios demo
> automáticamente** en el primer despliegue. Tú solo tienes que crear las dos
> cuentas y seguir los clics.

Tardarás unos **15–20 minutos**. Es gratis para empezar (Railway da crédito de
prueba).

---

## Parte A — Subir el código a GitHub

GitHub es donde "vive" el código para que Railway lo pueda leer.

1. Crea una cuenta en <https://github.com> (si no tienes).
2. Crea un repositorio vacío: botón **+** (arriba a la derecha) → **New
   repository**.
   - **Repository name:** `governance-platform`
   - Déjalo en **Private** (privado) si quieres.
   - **NO** marques "Add a README" ni nada más. Solo dale **Create repository**.
3. GitHub te mostrará una URL como
   `https://github.com/TU_USUARIO/governance-platform.git`. Cópiala.
4. Abre una terminal (PowerShell) y ejecuta, **reemplazando la URL por la tuya**:

   ```powershell
   cd C:\Users\LENOVO\Desktop\IA\governance-platform
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/governance-platform.git
   git push -u origin main
   ```

   La primera vez te pedirá iniciar sesión en GitHub (se abre el navegador).
   Acepta y el código se subirá.

> ✅ Tu `.env` con secretos **no** se sube (está protegido en `.gitignore`).

---

## Parte B — Desplegar en Railway

1. Entra a <https://railway.com> y haz **Login with GitHub** (usa tu cuenta de
   GitHub recién creada). Autoriza el acceso.
2. **New Project** → **Deploy from GitHub repo** → elige `governance-platform`.
   - Si te pide instalar la app de Railway en GitHub, acéptalo y selecciona el
     repo.
   - Railway empezará a construir. Va a fallar la primera vez **porque todavía
     falta la base de datos** — es normal, sigue.
3. **Agrega la base de datos:** dentro del proyecto, botón **+ New** →
   **Database** → **Add PostgreSQL**. Railway crea la BD automáticamente.
4. **Configura las variables.** Haz clic en tu **servicio web** (el de tu app,
   no el de Postgres) → pestaña **Variables** → agrega estas (botón
   *New Variable* o *Raw Editor*):

   | Variable | Valor |
   |---|---|
   | `DATABASE_PROVIDER` | `postgresql` |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `NEXTAUTH_SECRET` | `c7ebefbfeb62085368a05099dbdb5f991154938c44016f9aea4625b76e2b5e1d` |
   | `AUTH_SECRET` | `c7ebefbfeb62085368a05099dbdb5f991154938c44016f9aea4625b76e2b5e1d` |
   | `AUTH_TRUST_HOST` | `true` |
   | `STORAGE_TYPE` | `local` |

   > `${{Postgres.DATABASE_URL}}` es una referencia: Railway la rellena sola con
   > la conexión a tu PostgreSQL. Escríbela tal cual.

5. **Genera el dominio público:** servicio web → pestaña **Settings** →
   **Networking** → **Generate Domain**. Te dará algo como
   `gobernanza-production.up.railway.app`. **Cópialo.**
6. Vuelve a **Variables** y agrega dos más con tu dominio (con `https://`):

   | Variable | Valor |
   |---|---|
   | `NEXTAUTH_URL` | `https://TU-DOMINIO.up.railway.app` |
   | `AUTH_URL` | `https://TU-DOMINIO.up.railway.app` |

7. Railway volverá a desplegar solo. En el primer arranque correcto, la app:
   - crea las tablas en PostgreSQL,
   - **siembra los usuarios demo** automáticamente.

8. Abre tu dominio en el navegador 🎉. Entra con:
   - **`superadmin@empresa.com`** / **`Demo1234!`** (configura tu 2FA igual que
     en local).

> Otros usuarios demo (misma contraseña): `presidente@`, `secretario@`,
> `miembro@`, `auditor@` `@empresa.com`.

---

## Parte C — Que los documentos NO se borren (recomendado)

El disco de Railway es **temporal**: si no haces esto, los PDFs que subas se
pierden en cada redespliegue (todo lo demás —usuarios, sesiones, votos— sí
persiste porque está en PostgreSQL).

Para que los documentos persistan, agrega un **volumen**:

1. Servicio web → pestaña **Settings** (o **Volumes**) → **+ Add Volume**.
2. **Mount path:** `/app/uploads`
3. Guarda. Railway redesplegará y los archivos subidos quedarán guardados ahí.

---

## Parte D — Activar la IA (opcional)

Para el resumen de actas y la búsqueda semántica, agrega una variable más:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (tu clave de <https://console.anthropic.com>) |

Sin esta clave la plataforma funciona igual; solo esas dos funciones de IA
quedan desactivadas con un aviso.

---

## ✅ Resumen de variables en Railway

```env
DATABASE_PROVIDER=postgresql
DATABASE_URL=${{Postgres.DATABASE_URL}}
NEXTAUTH_SECRET=c7ebefbfeb62085368a05099dbdb5f991154938c44016f9aea4625b76e2b5e1d
AUTH_SECRET=c7ebefbfeb62085368a05099dbdb5f991154938c44016f9aea4625b76e2b5e1d
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://TU-DOMINIO.up.railway.app
AUTH_URL=https://TU-DOMINIO.up.railway.app
STORAGE_TYPE=local
# Opcionales:
ANTHROPIC_API_KEY=
```

---

## 🔄 Para subir cambios después

Cada vez que cambies algo en el código:

```powershell
cd C:\Users\LENOVO\Desktop\IA\governance-platform
git add -A
git commit -m "describe tu cambio"
git push
```

Railway detecta el push y **redespliega solo**. 🚀

---

## 🆘 Si algo falla

- **El build falla la primera vez:** normal si aún no agregaste PostgreSQL o las
  variables. Agrégalas y vuelve a desplegar (botón **Deploy** / **Redeploy**).
- **"Application failed to respond":** revisa que `NEXTAUTH_URL` y `AUTH_URL`
  coincidan EXACTAMENTE con tu dominio (con `https://`, sin `/` al final).
- **No puedo iniciar sesión / error de sesión:** casi siempre es `AUTH_SECRET` /
  `NEXTAUTH_SECRET` faltante o distinto entre ambos, o `AUTH_TRUST_HOST` sin
  poner en `true`.
- **Ver los registros:** servicio web → pestaña **Deployments** → **View Logs**.
