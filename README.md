# SCILA AI Portal — Fase 1

## Qué incluye esta fase

- ✅ Proyecto Next.js 14 con TypeScript y Tailwind CSS
- ✅ Tema SCILA AI (dark/light mode) con colores de marca
- ✅ Sistema de autenticación completo (login, forgot password, callback)
- ✅ Middleware de protección de rutas y redirección por rol
- ✅ Layout Admin con sidebar (Dashboard, Clientes, Facturación, Auditoría)
- ✅ Layout Portal con sidebar (Dashboard, Conversaciones, Equipo, Perfil)
- ✅ Conexión a Supabase Central configurada
- ✅ Cliente dinámico para Supabase de clientes
- ✅ Cifrado AES-256 para credenciales
- ✅ Sistema de permisos por rol
- ✅ Provider de tema con persistencia
- ✅ Tipos TypeScript completos
- ✅ Componentes shared (Sidebar, Header)

## Cómo ponerlo en marcha

### 1. Descomprime el proyecto

```bash
tar -xzf scila-ai-portal.tar.gz
cd scila-ai-portal
```

### 2. Instala dependencias

```bash
npm install
```

### 3. Verifica el archivo .env.local

El archivo `.env.local` ya viene configurado con tus credenciales.
**IMPORTANTE**: Este archivo NO se sube a GitHub. Si clonas desde otro sitio, tendrás que crearlo.

### 4. Arranca el servidor de desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

### 5. Crea el usuario admin (SOLO LA PRIMERA VEZ)

Ejecuta esto en tu terminal una vez que el servidor esté corriendo:

```bash
curl -X POST http://localhost:3000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"secret": "scila_setup_2026"}'
```

Esto crea:
- Un usuario en Supabase Auth con email Scilasystems@gmail.com y contraseña Scilaexito@698
- Un registro en portal_usuarios con rol super_admin

### 6. Inicia sesión

Ve a http://localhost:3000/login y entra con:
- **Email**: Scilasystems@gmail.com
- **Contraseña**: Scilaexito@698

Serás redirigido al dashboard de admin.

## Estructura del proyecto

```
scila-ai-portal/
├── src/
│   ├── app/
│   │   ├── (auth)/          <- Login, register, forgot password
│   │   ├── (admin)/         <- Panel de administrador
│   │   ├── (portal)/        <- Portal del cliente
│   │   ├── api/             <- API routes
│   │   ├── layout.tsx       <- Root layout
│   │   ├── page.tsx         <- Redirect basado en rol
│   │   └── globals.css      <- Estilos globales
│   ├── components/
│   │   ├── shared/          <- Sidebar, Header, ThemeProvider
│   │   ├── admin/           <- (Fase 2+)
│   │   ├── portal/          <- (Fase 4+)
│   │   ├── charts/          <- (Fase 6)
│   │   └── conversations/   <- (Fase 5)
│   ├── lib/
│   │   ├── supabase/        <- Clientes Supabase (central + dinámico)
│   │   ├── encryption.ts    <- Cifrado AES-256
│   │   ├── permissions.ts   <- Checks de roles y permisos
│   │   └── utils.ts         <- Utilidades generales
│   ├── types/
│   │   └── index.ts         <- Todos los tipos TypeScript
│   └── middleware.ts         <- Protección de rutas
├── public/
│   └── logo.png             <- Logo de SCILA AI
├── .env.local                <- Variables de entorno (NO subir a git)
├── tailwind.config.ts        <- Tema con colores SCILA AI
└── package.json
```

## Subir a GitHub

```bash
git init
git add .
git commit -m "Fase 1: Fundamentos y autenticacion"
git remote add origin https://github.com/TU_USUARIO/scila-ai-portal.git
git push -u origin main
```

**IMPORTANTE**: El .gitignore ya excluye .env.local para que las credenciales no se suban.

## Siguiente: Fase 2

La Fase 2 incluirá:
- Wizard completo de creación de clientes (7 pasos)
- CRUD de clientes en el panel admin
- Conexión dinámica a Supabase de clientes
- Detección automática de tablas
- Cifrado/descifrado de credenciales en producción
