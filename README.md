# SportKeeper Frontend

Frontend de SportKeeper, una aplicacion web para gestionar clases, reservas, usuarios, actividades y notas de progreso de un gimnasio.

El proyecto esta construido con Next.js, React, TypeScript y Tailwind CSS. Consume una API externa configurada mediante `NEXT_PUBLIC_API_URL`.

## Tecnologias

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Netlify para despliegue

## Requisitos

- Node.js 20 o superior recomendado
- npm
- Backend/API de SportKeeper disponible

## Instalacion

```bash
npm install
```

Crea o revisa el archivo `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Si el backend esta desplegado en otro host, cambia el valor de `NEXT_PUBLIC_API_URL`.

## Desarrollo

```bash
npm run dev
```

La aplicacion se abre por defecto en:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
```

Arranca el servidor de desarrollo.

```bash
npm run build
```

Genera la build de produccion.

```bash
npm run start
```

Arranca la aplicacion en modo produccion despues de compilar.

```bash
npm run lint
```

Ejecuta el linter de Next.js.

## Estructura

```text
app/
  page.tsx                         Login, registro e inicio
  slots/page.tsx                   Calendario de clases disponibles
  student/notes/page.tsx           Notas de progreso del alumno
  teacher/slots/attendees/page.tsx Asistentes de un slot
  admin/slots/page.tsx             Gestion de slots
  admin/activities/page.tsx        Gestion de actividades
  admin/users/page.tsx             Gestion de usuarios

components/
  AuthContext.tsx                  Contexto de autenticacion
  ProgressNoteCard.tsx             Tarjeta de nota de progreso
  ui/                              Componentes reutilizables de interfaz

lib/
  api.ts                           Cliente HTTP con token Bearer
  config.ts                        Configuracion de la URL de API
  format.ts                        Utilidades de fecha y formato
```

## Funcionalidades

- Registro e inicio de sesion.
- Persistencia del token JWT en `localStorage`.
- Carga del perfil autenticado mediante `/api/me`.
- Calendario mensual de clases disponibles.
- Reserva de plazas en clases.
- Vista de notas de progreso para alumnos.
- Panel de administracion de usuarios.
- Cambio de roles `ADMIN`, `COACH` y `MEMBER`.
- Alta y edicion de actividades.
- Creacion, repeticion, edicion de capacidad y borrado de slots.
- Consulta de asistentes de un slot para profesores/coaches.

## Rutas principales

| Ruta | Descripcion |
| --- | --- |
| `/` | Login, registro y resumen de usuario autenticado |
| `/slots` | Calendario de clases y reservas |
| `/student/notes` | Notas de progreso del alumno |
| `/teacher/slots/attendees` | Vista de asistentes de un slot |
| `/admin/slots` | Administracion de clases/slots |
| `/admin/activities` | Administracion de actividades |
| `/admin/users` | Administracion de usuarios |

## API esperada

El frontend espera una API con endpoints como:

```text
POST   /api/auth/login
POST   /api/auth/register
GET    /api/me
GET    /api/slots
POST   /api/reservations
GET    /api/student/me/notes
GET    /api/teacher/slots/:slotId/attendees
GET    /api/activities
POST   /api/admin/activities
PUT    /api/admin/activities/:id
GET    /api/admin/users
GET    /api/admin/users?role=COACH
PATCH  /api/admin/users/:id/role
DELETE /api/admin/users/:id
POST   /api/admin/slots
PUT    /api/admin/slots/:id
DELETE /api/admin/slots/:id
```

Las llamadas autenticadas envian el token guardado en `localStorage` como:

```text
Authorization: Bearer <token>
```

## Roles

- `MEMBER`: puede ver clases disponibles, reservar y consultar sus notas.
- `COACH`: puede acceder a vistas de profesor y administracion de slots.
- `ADMIN`: puede gestionar usuarios, actividades y slots.

## Despliegue en Netlify

El repositorio incluye `netlify.toml` con:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

En Netlify hay que configurar la variable de entorno:

```text
NEXT_PUBLIC_API_URL=https://tu-api.example.com
```

## Notas de desarrollo

- El cliente HTTP esta centralizado en `lib/api.ts`.
- La URL base de API esta en `lib/config.ts`.
- Las fechas se formatean con utilidades locales en `lib/format.ts`.
- La navegacion se adapta al rol del usuario autenticado.
