# Imagen de producción para Railway.
# Incluye LibreOffice (headless) para convertir DOCX/XLSX/PPTX a PDF y poder
# aplicarles la marca de agua dinámica.

FROM node:20-bookworm-slim

# La imagen es solo para producción → PostgreSQL.
ENV DATABASE_PROVIDER=postgresql
# Placeholder de build (Railway inyecta el real en runtime). prisma generate /
# next build no se conectan a la BD.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_TELEMETRY_DISABLED=1

# LibreOffice + fuentes para la conversión a PDF.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       libreoffice-writer \
       libreoffice-calc \
       libreoffice-impress \
       fonts-liberation \
       fontconfig \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos todo y luego instalamos (postinstall necesita scripts/ y prisma/).
COPY . .

RUN npm ci --legacy-peer-deps
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# start:prod = ajustar provider + db push + seed + next start
CMD ["npm", "run", "start:prod"]
