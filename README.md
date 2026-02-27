# MiComercio360

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
![Node.js >=22](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Supabase](https://img.shields.io/badge/Supabase-Integrated-3ECF8E?logo=supabase&logoColor=white)

Sistema POS y de gestión empresarial construido con Next.js, Supabase y TypeScript, orientado a pymes que necesitan ventas, inventario, contabilidad, cartera, compras y reportes en una sola plataforma.

Este repositorio se publica como **open source** para que cualquier persona pueda usarlo, desplegarlo, adaptarlo y contribuir.

## ✨ Características

- Autenticación y gestión multiusuario con Supabase Auth.
- Configuración inicial de empresa y control de permisos por módulos.
- POS con soporte de ventas, devoluciones, turnos y caja.
- Gestión comercial: clientes, proveedores, cotizaciones, notas de entrega y facturación.
- Inventario avanzado: productos, categorías, bodegas, ajustes y trazabilidad.
- Módulos administrativos y contables: cuentas, pagos, recaudos, impuestos, informes y balances.
- Facturación/cotizaciones por email con SMTP.
- Procesamiento de documentos recurrentes por endpoint de cron.
- Preparado para despliegue en Docker y Railway.

## 🧱 Stack tecnológico

- **Frontend/Backend:** Next.js (App Router), React, TypeScript.
- **UI:** Tailwind CSS + Radix UI.
- **Base de datos/Auth/Storage:** Supabase.
- **Reportes y exportaciones:** jsPDF, exceljs, html2canvas.
- **Email:** Nodemailer.

## 📦 Requisitos

- Node.js 22+
- pnpm 9+
- Proyecto de Supabase (cloud o local)
- (Opcional) Supabase CLI para correr la base de datos en local

## 🚀 Inicio rápido

1. Clona el repositorio:

   ```bash
   git clone https://github.com/Rengifo-SAS/MiComercio360.git
   cd MiComercio360
   ```

2. Instala dependencias:

   ```bash
   pnpm install
   ```

3. Crea el archivo de entorno:

   ```bash
   cp .env.example .env.local
   ```

4. Ajusta variables de entorno (ver tabla siguiente).

5. Inicia en desarrollo:

   ```bash
   pnpm dev
   ```

6. Abre `http://localhost:3000`.

## 🔐 Variables de entorno

Puedes usar este contenido base en `.env.example`:

```env
# App
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (requeridas)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=

# Cron (opcional, recomendado para producción)
CRON_SECRET=

# SMTP (opcional, requerido para envío de facturas/cotizaciones por email)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Branding/otros (opcionales)
COMPANY_NAME=MiComercio360
DEFAULT_COMPANY_ID=
```

### Notas

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` son obligatorias.
- Si configuras `CRON_SECRET`, debes enviar `Authorization: Bearer <CRON_SECRET>` al endpoint de cron.
- Para envío de correos, configura SMTP completo.

## 🗄️ Base de datos (Supabase)

El proyecto incluye un conjunto grande de migraciones SQL en `supabase/migrations/`.

### Opción A: usar Supabase Cloud

- Crea un proyecto en Supabase.
- Aplica migraciones usando Supabase CLI (autenticado contra tu proyecto).

### Opción B: entorno local con Supabase CLI

```bash
supabase start
supabase db reset
```

> Nota: `supabase/config.toml` referencia `seed.sql`, pero el archivo no está en el repositorio. Puedes crear tu propio seed opcional.

## 🧪 Scripts

- `pnpm dev`: inicia entorno de desarrollo.
- `pnpm build`: genera build de producción.
- `pnpm start`: ejecuta build en modo producción.
- `pnpm lint`: ejecuta lint.

Script adicional:

```bash
node scripts/cleanup-offline-data.js help
```

Comandos disponibles: `stats`, `clean`, `migrate`, `all`.

## 📚 Módulos principales

- Dashboard y analítica comercial.
- POS y ventas.
- Inventario, bodegas y categorías.
- Clientes y proveedores.
- Cotizaciones, notas de entrega y facturas de compra.
- Pagos, recaudos y movimientos de caja.
- Reportes de ventas, administrativos, contables y tributarios.
- Configuración (empresa, usuarios, impuestos, numeraciones, plantillas).

## 🔌 Endpoints API relevantes

- `GET /api/health`: healthcheck de servicio.
- `POST /api/auth/check-setup`: estado de configuración inicial.
- `POST /api/send-invoice`: envío de factura por correo.
- `POST /api/send-quote`: envío de cotización por correo.
- `GET|POST /api/cron/process-recurring`: procesamiento de documentos recurrentes.

## 🐳 Despliegue

El repositorio incluye:

- `Dockerfile` multi-stage para producción.
- `railway.json` y `nixpacks.toml` para Railway.

Pasos mínimos:

1. Configura variables de entorno en tu plataforma.
2. Ejecuta `pnpm build` (o build Docker).
3. Expón el puerto `3000`.
4. Configura healthcheck en `/api/health`.

## 🤝 Contribución

Las contribuciones son bienvenidas.

1. Haz fork del repositorio.
2. Crea una rama: `feat/mi-cambio`.
3. Ejecuta `pnpm lint` y valida que no rompa el build.
4. Abre un Pull Request con contexto claro del cambio.

## 📄 Licencia

Este proyecto se distribuye bajo licencia **ISC**. Consulta el archivo [LICENSE](LICENSE).
