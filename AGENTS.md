# Gremio de Tragones — Agent Guide

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Stack Tecnológico y Versiones](#stack-tecnológico-y-versiones)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Convenciones de Código](#convenciones-de-código)
5. [Sistema de Diseño Medieval/Fantasía](#sistema-de-diseño-medievalfantasía)
6. [Arquitectura de Base de Datos (Supabase)](#arquitectura-de-base-de-datos-supabase)
7. [Flujos de Negocio](#flujos-de-negocio)
8. [Patrones de Componentes](#patrones-de-componentes)
9. [Hooks Personalizados](#hooks-personalizados)
10. [Configuración PWA](#configuración-pwa)
11. [Seguridad (RLS)](#seguridad-rls)
12. [Build y Despliegue](#build-y-despliegue)
13. [Restricciones y Limitaciones](#restricciones-y-limitaciones)
14. [Añadir Nuevas Funcionalidades](#añadir-nuevas-funcionalidades)

---

## Visión General

**Gremio de Tragones** es una PWA de gamificación medieval/fantasía moderna que conecta aventureros (usuarios) con comerciantes (establecimientos). El objetivo es que los aventureros completen misiones en locales comerciales y reciban recompensas XP por sus visitas verificadas mediante códigos QR.

### Roles de Usuario

| Rol | Descripción | Capacidades |
|-----|-------------|-------------|
| `adventurer` | Usuario normal | Completar misiones, ver rangos, acceder ofertas |
| `merchant` | Comerciante | Escanear QR, verificar misiones de SUS establecimientos |
| `admin` | Administrador | CRUD total: establecimientos, misiones, ofertas, usuarios |

### Sistema de Rangos

```
F (0 XP) → E (100) → D (300) → C (600) → B (1000) → A (1600) → S (2500+)
```

- Rango F = invitado sin registro (progreso local en IndexedDB)
- Rango S = "Señor Dragón" con acceso a Taberna Secreta (ofertas exclusivas)

---

## Stack Tecnológico y Versiones

**CRÍTICO**: Esta versión específica de cada paquete es la que se usó para desarrollar y compilar correctamente. Cambiar versiones puede romper la build.

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "framer-motion": "^11.11.0",
    "html5-qrcode": "^2.3.8",
    "localforage": "^1.10.0",
    "lucide-react": "^0.460.0",
    "qrcode.react": "^4.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "~5.6.3",
    "vite": "^5.4.11",
    "vite-plugin-pwa": "^0.21.0"
  }
}
```

### Por qué estas versiones

- **Vite 5** (no 8): Node.js 20.18 no es compatible con Vite 8 (requiere 20.19+)
- **React 18** (no 19): Compatible con React Router v6 y framer-motion v11
- **Tailwind CSS 3** (no 4): Tailwind 4 requiere Vite 6+ y tiene sintaxis diferente (`@import` vs `@tailwind`)
- **TypeScript 5.6**: Compatible con Vite 5 y todas las opciones de strict mode
- **vite-plugin-pwa 0.21**: Compatible con Vite 5

### Si necesitas actualizar Node.js

Si tu máquina tiene Node.js 20.19+ o 22.12+, puedes intentar actualizar a:
- Vite 8 + React 19 + Tailwind 4 + React Router v7

Pero requerirá cambios significativos en `vite.config.ts`, `tailwind.config.js`, CSS (`@import` vs `@tailwind`), y en los imports de React (`useNavigate` cambia).

---

## Estructura de Carpetas

```
Gremio de Tragones/
├── public/                         # Assets estáticos públicos
│   ├── favicon.svg                 # Logo SVG del escudo/dragón
│   ├── pwa-192x192.png            # Icono PWA 192x192 (generado con .NET)
│   ├── pwa-512x512.png            # Icono PWA 512x512
│   └── offline-fallback.html       # Página offline standalone
├── src/
│   ├── assets/patterns/            # SVGs decorativos (texturas, escudos)
│   ├── components/
│   │   ├── layout/                # Componentes de estructura de página
│   │   │   ├── AppRouter.tsx      # Router principal (lazy loading pages)
│   │   │   ├── BottomNav.tsx      # Navegación inferior fija (móvil)
│   │   │   ├── TopBar.tsx         # Header sticky con logo
│   │   │   └── GuestBanner.tsx    # Banner sticky para invitados (no-auth)
│   │   ├── ui/                    # Componentes base reutilizables
│   │   │   ├── Button.tsx         # Botón temático (variants: gold/outline/ghost/danger)
│   │   │   ├── Card.tsx           # Card con borde dorado, hover opcional
│   │   │   ├── Badge.tsx          # Insignia de rango/oferta
│   │   │   ├── XPBar.tsx          # Barra de progreso XP con textura pergamino
│   │   │   ├── Modal.tsx          # Modal animado (framer-motion)
│   │   │   └── Toast.tsx          # Sistema de notificaciones (ToastProvider)
│   │   ├── missions/              # Componentes específicos de misiones
│   │   │   ├── MissionCard.tsx    # Card de misión (título, XP, estado, botón QR)
│   │   │   ├── MissionQRGenerator.tsx  # Genera QR con countdown 2min
│   │   │   └── MissionList.tsx    # Lista filtrable/buscable de misiones
│   │   ├── guild/                 # Componentes de sistema de rangos
│   │   │   ├── RankBadge.tsx      # Badge circular de rango (S-rank tiene glow animado)
│   │   │   └── RankProgress.tsx   # Barra de progreso + escala de rangos
│   │   ├── merchant/               # Componentes para comerciantes
│   │   │   ├── MerchantScanner.tsx # Escáner QR con html5-qrcode
│   │   │   ├── EstablishmentCard.tsx  # Card de establecimiento
│   │   │   └── OfferCard.tsx      # Card de oferta con tipo/valor/rango
│   │   └── admin/                 # Componentes de administración
│   │       ├── AdminDashboard.tsx # Panel CRUD completo (estadísticas, acciones)
│   │       └── MissionForm.tsx    # Form crear/editar misión + form de ofertas
│   ├── hooks/                     # 7 hooks personalizados
│   ├── lib/                      # Utilidades y configuración
│   │   ├── constants.ts           # Constantes de rangos, colores, configuración
│   │   ├── supabase.ts           # Cliente Supabase singleton
│   │   ├── rank-calculator.ts    # Lógica de cálculo de rango y progreso
│   │   ├── qr-utils.ts           # Generación/validación de QR (SHA-256 simplificado)
│   │   └── storage.ts            # Wrapper localforage para IndexedDB
│   ├── pages/                    # 9 páginas (todas con lazy loading)
│   │   ├── HomePage.tsx         # Dashboard principal
│   │   ├── MissionsPage.tsx     # Tablero de misiones con QR generator
│   │   ├── GuildPage.tsx        # Página de rangos con jerarquía visual
│   │   ├── ProfilePage.tsx      # Perfil + auth (registro/login/logout)
│   │   ├── OffersPage.tsx       # Sala del Tesoro (ofertas + Taberna Secreta)
│   │   ├── ScanPage.tsx         # Página de escaneo QR (solo merchant/admin)
│   │   ├── AdminPage.tsx        # Panel admin (protegido por rol)
│   │   ├── LoginPage.tsx        # Redirect a /profile
│   │   └── OfflinePage.tsx       # Fallback offline
│   ├── styles/
│   │   └── index.css            # Tailwind + @layer utilities medieval
│   ├── types/
│   │   ├── index.ts             # Tipos de la aplicación (Profile, Mission, etc.)
│   │   └── supabase.ts          # Tipos de BD Supabase (Database)
│   ├── App.tsx                  # Root component
│   └── main.tsx                 # Entry point + PWA registration + beforeinstallprompt
├── supabase/migrations/
│   └── 001_initial_schema.sql    # TODA la DB: tablas, triggers, RLS, RPC
├── index.html
├── vite.config.ts                # Vite + PWA plugin
├── tailwind.config.js            # Paleta medieval, fuentes, animaciones
├── postcss.config.js             # Autoprefixer
├── tsconfig.json                 # Composite project references
├── tsconfig.app.json            # app (strict, verbatimModuleSyntax)
├── tsconfig.node.json           # vite.config
└── package.json
```

### Nota sobre lazy loading

Todas las páginas se cargan con `lazy(() => import(...))` dentro de `AppRouter`. Esto:
- Reduce el bundle inicial (~110 KB gzip el main, vs 270 KB si todo inline)
- Cada página es un chunk separado en `dist/assets/`
- El Router envuelve todo en `<Suspense><PageLoader /></Suspense>`

---

## Convenciones de Código

### TypeScript Estricto

```json
// tsconfig.app.json - opciones clave
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "verbatimModuleSyntax": true,
  "noFallthroughCasesInSwitch": true
}
```

### Importar tipos

Con `verbatimModuleSyntax: true`, **siempre** usa `import type` para tipos que solo se usan como tipos:

```typescript
// ✅ Correcto
import type { Mission, MissionStatus } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ❌ Incorrecto — import sin 'type' para un tipo
import { type Mission } from '../types'
```

### Nomenclatura de archivos

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes React | PascalCase | `MissionCard.tsx` |
| Hooks | camelCase con prefijo `use` | `useAuth.ts` |
| Utilidades/lib | camelCase | `qr-utils.ts` |
| Constantes | camelCase | `constants.ts` |
| Tipos | PascalCase o sufijado | `supabase.ts`, `index.ts` |
| SQL migrations | `NNN_descripción.sql` | `001_initial_schema.sql` |

### Props de componentes

```typescript
// ✅ Componente con props tipadas
interface MissionCardProps {
  mission: Mission
  status: string | null
  isGuest: boolean
  onOpenQR: (mission: Mission) => void
  isCompleted: boolean
}

// ❌ Props no tipadas
export function MissionCard(props) { ... }
```

### Props que son funciones callback

Siempre tipar el parámetro de callback:

```typescript
// ✅ Correcto
onOpenQR: (mission: Mission) => void

// ❌ Incorrecto — demasiado genérico
onOpenQR: (m: any) => void
```

### Framer Motion

Para `motion.button`, **no spreads** `...props` que incluyan `onDrag`, `onAnimationStart`, etc. porque conflicto con los handlers de framer-motion. Definir props explícitamente:

```typescript
// ✅ Button.tsx — interface explícito, sin eventos de drag/animation
interface ButtonProps {
  variant?: 'gold' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
  children?: ReactNode
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
}
```

---

## Sistema de Diseño Medieval/Fantasía

### Paleta de Colores

Definida en `tailwind.config.js` y replicada en `src/lib/constants.ts`:

```javascript
colors: {
  gold: { DEFAULT: '#D4AF37', light: '#F0D068', dark: '#A68A20' },
  parchment: { DEFAULT: '#F5F0E8', dark: '#E8DFCC' },
  forest: { DEFAULT: '#166534', light: '#1B7A3F' },
}
```

| Color | Hex | Uso |
|-------|-----|-----|
| Fondo | `#0F172A` | `bg-slate-900` (Tailwind) |
| Dorado | `#D4AF37` | Acentos, bordes, títulos |
| Pergamino | `#F5F0E8` | Texturas de barras de progreso |
| Verde bosque | `#166534` | Establecimientos activos |
| Texto | `#E2E8F0` | `text-slate-200` |
| Éxito | `#22C55E` | `text-emerald` (XP gained) |
| Error | `#EF4444` | `text-red` |

### Tipografía

| Uso | Fuente | Config |
|-----|--------|--------|
| Títulos | `Cinzel` (serif) | `font-display` |
| Cuerpo | `Inter` (sans-serif) | `font-body` |

Ambas cargadas via Google Fonts en `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

### Animaciones

Definidas en `tailwind.config.js`:

```javascript
animation: {
  's-glow': 's-glow 2s ease-in-out infinite alternate',
  shimmer: 'shimmer 2s infinite',
},
keyframes: {
  's-glow': {
    '0%': { boxShadow: '0 0 5px #D4AF37, 0 0 10px #D4AF37' },
    '100%': { boxShadow: '0 0 15px #D4AF37, 0 0 30px #D4AF37, 0 0 45px #D4AF37' },
  }
}
```

Uso:
```tsx
// Badge dorado animado para rango S
<RankBadge rank="S" size="lg" showName />
// → Aplica clase .s-rank-glow con animación glow

// Barra de XP con textura pergamino
<XPBar current={250} max={500} />
// → Fondo con textura SVG de ruido (parchment-texture)
```

### Touch Targets

Todos los botones y elementos interactivos tienen `min-h-[44px]` y `min-w-[44px]` para cumplir con accesibilidad móvil WCAG AA.

---

## Arquitectura de Base de Datos (Supabase)

### Diagrama de Tablas

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  profiles   │────▶│  establishments   │◀────│   missions   │
│  (usuarios) │     │  (locales)       │     │  (misiones)  │
└─────────────┘     └──────────────────┘     └──────────────┘
       │                    │                        │
       │                    │                        │
       ▼                    ▼                        ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  visits     │     │   offers     │     │  user_missions  │
│  (visitas)  │     │  (ofertas)   │     │ (progreso user) │
└─────────────┘     └──────────────┘     └──────────────────┘
```

### Tabla: `profiles`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID | PK |
| `auth_id` | UUID | FK → auth.users.id, UNIQUE |
| `email` | VARCHAR | Del auth user |
| `full_name` | VARCHAR | Del meta o registro |
| `role` | app_role | ENUM: adventurer, merchant, admin |
| `xp` | INTEGER | DEFAULT 0, CHECK >= 0 |
| `rank` | VARCHAR(1) | DEFAULT 'F', calculado por trigger |
| `avatar_url` | TEXT | Opcional |

### Tabla: `establishments`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID | PK |
| `name` | VARCHAR | Requerido |
| `description` | TEXT | Opcional |
| `image_url` | TEXT | URL de imagen |
| `owner_id` | UUID | FK → profiles.id (el comerciante dueño) |
| `address` | TEXT | Opcional |
| `is_active` | BOOLEAN | DEFAULT true |

### Tabla: `missions`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID | PK |
| `establishment_id` | UUID | FK → establishments.id |
| `title` | VARCHAR | Requerido |
| `description` | TEXT | Opcional |
| `xp_reward` | INTEGER | DEFAULT 10, CHECK > 0 |
| `required_min_rank` | VARCHAR(1) | DEFAULT 'F' |
| `offer_type` | offer_type | ENUM: free_item, discount, exclusive, other |
| `is_active` | BOOLEAN | DEFAULT true |

### Tabla: `user_missions`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles.id |
| `mission_id` | UUID | FK → missions.id |
| `status` | mission_status | ENUM: pending, completed, verified |
| `completed_at` | TIMESTAMPTZ | Nullable |
| `verified_by` | UUID | FK → profiles.id (comerciante que verificó) |
| **UNIQUE** | | (user_id, mission_id) |

### Tabla: `offers`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID | PK |
| `establishment_id` | UUID | FK → establishments.id |
| `title` | VARCHAR | Requerido |
| `description` | TEXT | Opcional |
| `type` | VARCHAR | free_item, discount, exclusive, other |
| `value` | VARCHAR | "-30%" o "Gratis" etc |
| `required_rank` | VARCHAR(1) | DEFAULT 'F' |
| `valid_until` | DATE | Nullable |
| `is_active` | BOOLEAN | DEFAULT true |

### Tabla: `visits`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles.id |
| `establishment_id` | UUID | FK → establishments.id |
| `mission_id` | UUID | FK → missions.id, nullable |
| `verified_at` | TIMESTAMPTZ | DEFAULT now() |
| `qr_signature` | VARCHAR | Hash del QR para auditoría |

### Funciones y Triggers

#### `calculate_rank(xp INTEGER)` — FUNCTION

```sql
RETURNS VARCHAR — 'F' a 'S'
```

Calcula el rango basado en umbrales XP. Usada por el trigger.

#### `update_rank_trigger_fn()` — TRIGGER FUNCTION

Se dispara **ANTES** de INSERT o UPDATE en `profiles.xp`.

```sql
NEW.rank := calculate_rank(NEW.xp)
NEW.updated_at := now()
```

#### `handle_new_user()` — TRIGGER FUNCTION

Se dispara **DESPUÉS** de INSERT en `auth.users`.

```sql
INSERT INTO profiles (auth_id, email, full_name, role, xp, rank)
VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', '...'), ...)
```

#### `verify_and_complete_mission(payload JSONB, verifier_auth_id UUID)` — RPC

Validación:
1. Payload QR: campos `u`, `m`, `t`, `h` todos presentes
2. Timestamp < 2 minutos
3. Hash SHA-256 correcto
4. Verificador tiene rol admin o merchant
5. Comerciante es dueño del establecimiento de la misión
6. Usuario no ha completado ya esta misión
7. Usuario tiene el rango mínimo requerido

Si todo OK:
- Inserta/actualiza `user_missions` con status 'verified'
- Inserta registro en `visits`
- Suma XP al perfil del usuario
- Retorna `{ success: true, xp_awarded, new_total_xp, new_rank }`

#### `migrate_guest_progress(p_auth_id UUID, p_guest_xp INTEGER)` — RPC

Migra progreso de IndexedDB (invitado) a Supabase (usuario registrado):
- Si XP invitado >= 100: asigna rango E mínimo
- Si XP invitado < 100: suma XP tal cual

---

## Flujos de Negocio

### 1. Modo Invitado (Sin Registro)

```
Usuario abre app
    ↓
useAuth() detecta: sin sesión Supabase
    ↓
getOrCreateGuestProfile() → localforage IndexedDB
    ↓
Muestra: GuestBanner fijo + rango F + XP local
    ↓
Misiones visibles pero botón "Regístrate para completar"
```

- Progreso en `localforage`: `{ guestId, xp, completedMissions[], createdAt }`
- GuestBanner muestra botón: "Inscríbete en el Gremio" → `/profile`

### 2. Registro y Migración

```
Usuario completa registro (email/pass o Google)
    ↓
handle_new_user() trigger crea perfil en Supabase
    ↓
migrateGuestProgress() RPC llamada desde ProfilePage
    ↓
Si guest.xp >= 100: obtiene rango E (100 XP exactos)
   Si guest.xp < 100: XP tal cual, sigue en F
    ↓
clearGuestProfile() elimina IndexedDB
    ↓
Perfil en Supabase activo, session iniciada
```

### 3. Generación de QR (Aventurero)

```
Usuario abre MissionsPage → ve lista de misiones
    ↓
Click en "Generar QR de Misión"
    ↓
generateQRPayload(userId, missionId):
  - timestamp = now().toISOString()
  - hash = SHA256(`${userId}:${missionId}:${timestamp}`)
  - payload = { u, m, t, h }
    ↓
QRCodeCanvas.render(payload como JSON string)
    ↓
Countdown 2 minutos visible
    ↓
Aventurero muestra QR al comerciante
```

### 4. Verificación QR (Comerciante)

```
Comerciante abre /scan → MerchantScanner activo
    ↓
html5-qrcode.start(camera) → decodifica QR
    ↓
JSON.parse(decoded) → payload
    ↓
supabase.rpc('verify_and_complete_mission', { payload, verifier_auth_id })
    ↓
RPC valida: timestamp, hash, rol, propiedad, no duplicado
    ↓
Inserta visit + actualiza user_missions + suma XP + recalcula rank
    ↓
Toast: "¡Misión verificada! +50 XP para el aventurero"
```

### 5. Sistema de Rangos

- Se calcula automáticamente en **servidor** (trigger SQL `update_rank_trigger_fn`)
- Se muestra en cliente vía `useRank(xp)` hook
- Rango S incluye glow dorado animado y "Taberna Secreta" en OffersPage

---

## Patrones de Componentes

### Page Component Pattern

Todas las páginas siguen este patrón:

```typescript
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { GuestBanner } from '../components/layout/GuestBanner'
import { GoldCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Loader2 } from 'lucide-react'  // Solo imports necesarios

export default function PageName() {
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/')} aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-slate-100">Título</h1>
      </div>

      <GuestBanner isGuest={isGuest} rank={rank} xp={user?.xp || 0} />

      {/* Contenido */}
    </div>
  )
}
```

### Card Pattern

```typescript
// Card simple clickeable
<Card hover onClick={() => handleClick()}>
  <p>Contenido</p>
</Card>

// GoldCard para énfasis
<GoldCard>
  <RankBadge rank="S" size="lg" />
</GoldCard>
```

### Modal Pattern

```typescript
const [isOpen, setIsOpen] = useState(false)

<Button onClick={() => setIsOpen(true)}>Abrir</Button>

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Título">
  {/* Contenido del modal */}
</Modal>
```

### Toast Pattern

```typescript
// En el componente:
const { toast } = useToast()

// Uso:
toast('success', '¡Misión completada!')
toast('error', 'Error al verificar')
toast('warning', 'Código QR expirado')
toast('info', 'Sesión expirada, regístrate de nuevo')

// El ToastProvider está en AppRouter — ya envuelve toda la app
```

---

## Hooks Personalizados

### `useAuth()`

Maneja el estado de autenticación global.

```typescript
const { user, session, isLoading, isGuest, refreshProfile, signOut } = useAuth()
```

**Estado inicial:**
- Carga `supabase.auth.getSession()`
- Si existe sesión → busca perfil en `profiles`
- Si no → `getOrCreateGuestProfile()` de localforage

**onAuthStateChange:**
- `SIGNED_IN` → busca perfil y actualiza estado
- `SIGNED_OUT` → limpia localforage y vuelve a modo invitado

### `useGuestSync()`

```typescript
const { migrateGuestProgress } = useGuestSync()
migrateGuestProgress(userId)  // → RPC call + limpia IndexedDB
```

### `useMissions(userRank, profileId, isGuest)`

```typescript
const { missions, userMissions, isLoading, fetchMissions, getMissionStatus } = useMissions(rank, user?.id, isGuest)
```

- `missions`: lista filtrada por rango del usuario
- `userMissions`: misiones completadas por el usuario (solo si logueado)
- `getMissionStatus(missionId)`: 'pending' | 'completed' | 'verified' | null

### `useRank(xp)`

```typescript
const { rank, rankName, nextRank, progress, colors } = useRank(user?.xp || 0)
```

- `rank`: letra actual ('F'...'S')
- `rankName`: nombre completo ('Iniciado'...'Señor Dragón')
- `nextRank`: `{ current, next, xpNeeded }`
- `progress`: `{ rank, progress: 0-100 }`
- `colors`: `{ bg, text, border }` para Tailwind

### `useQRScan(onScan)`

```typescript
const { isScanning, error, startScan, stopScan } = useQRScan((decoded) => { ... })
```

- Usa `html5-qrcode` (importado dinámicamente para reducir bundle)
- `startScan(elementId)`: inicia cámara en el div con ese ID
- `stopScan()`: limpia y libera cámara
- `onScan`: callback con el texto decodificado del QR

### `useEstablishments(userId, role)`

```typescript
const { establishments, isLoading, fetchEstablishments, createEstablishment, updateEstablishment } = useEstablishments(...)
```

- Admin ve todos
- Merchant ve los suyos (`owner_id`)
- Adventurer ve activos

### `useOffers(userRank)`

```typescript
const { offers, isLoading, fetchOffers } = useOffers(rank)
```

- Filtra ofertas por rango del usuario
- Separa S-rank en "Taberna Secreta" si `rank === 'S'`

---

## Configuración PWA

### vite.config.ts — PWA Plugin

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'offline-fallback.html'],
  manifest: {
    name: 'Gremio de Tragones',
    short_name: 'Gremio',
    theme_color: '#0F172A',
    background_color: '#0F172A',
    display: 'standalone',
    orientation: 'portrait-primary',
    icons: [/* 192x192, 512x512, maskable */],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    runtimeCaching: [/* Google Fonts cache 1 año */],
  },
})
```

### Iconos PWA

Generados con .NET System.Drawing en Windows:

```powershell
# 192x192 y 512x512
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($bmp)
# ...dibuja escudo dorado sobre fondo slate...
$bmp.Save("public\pwa-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)
```

Para regenerar iconos, usa el script en PowerShell o crea PNGs manualmente.

### beforeinstallprompt

Capturado en `main.tsx`:

```typescript
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as any).__pwaInstallPrompt = e
})
```

Para mostrar un botón de instalación custom, accede a `window.__pwaInstallPrompt` y llama `.prompt()`.

### Offline Fallback

`public/offline-fallback.html` se muestra cuando no hay conexión y el SW no tiene el recurso en cache. Es una página HTML standalone con estilos inline.

---

## Seguridad (RLS)

### Principios

1. **RLS habilitado en TODAS las tablas**
2. **Políticas por rol** — no hay acceso "abierto" excepto reads públicos mínimos
3. **Server-side validation** — la RPC `verify_and_complete_mission` valida todo antes de escribir

### Resumen de Políticas

| Tabla | adventurer | merchant | admin |
|-------|-----------|---------|-------|
| profiles | SELECT own | SELECT own | ALL |
| establishments | SELECT active | SELECT owner | ALL |
| missions | SELECT active + rank filter | SELECT/INSERT/UPDATE own estab | ALL |
| user_missions | ALL own | UPDATE verified (propios estab) | ALL |
| offers | SELECT active + rank filter | SELECT/INSERT/UPDATE own estab | ALL |
| visits | SELECT own | INSERT (verified visits) | ALL |

### RPC Security

`verify_and_complete_mission` usa `SECURITY DEFINER` para ejecutarse con privilegios del creador. Internamente valida:
- Que el verificador tenga rol `admin` o `merchant`
- Que el comerciante sea dueño del establecimiento
- Timestamp QR < 2 min
- Hash QR válido
- Misión activa
- Usuario no haya completado ya

### Contraseñas y Auth

- Supabase Auth maneja contraseñas (nunca se almacenan en nuestra DB)
- Session persiste en localStorage (Supabase default)
- `detectSessionInUrl: true` para OAuth redirect

---

## Build y Despliegue

### Build local

```bash
npm run build
# → genera dist/ con todos los assets
```

### Preview local

```bash
npm run preview
# → sirve dist/ en http://localhost:4173
```

### Despliegue en Vercel (gratuito)

```bash
npm i -g vercel
vercel
# Deploys automáticamente desde el directorio actual

# O conecta el repo en vercel.com/dashboard
# Framework: Vite
# Build command: npm run build
# Output directory: dist
```

**Variables de entorno necesarias en Vercel:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Despliegue en Netlify (alternativa gratuita)

Same build command y output directory. Netlify también soporta PWA con headers de cache apropiados.

### Lighthouse

```bash
npx lighthouse <url> --view --preset=desktop
```

El proyecto debería alcanzar:
- Performance: ~85-95
- PWA: 100
- Accessibility: ~90-95
- Best Practices: ~95

---

## Restricciones y Limitaciones

### Zero servicios de pago

Solo usamos:
- Supabase (tier gratuito)
- Vercel/Netlify (tier gratuito)
- Google Fonts (gratis)

### Bundle size

El bundle principal (`index.js`) es ~159 KB gzip. Los chunks de páginas son lazy-loaded. El total precacheado por el SW es ~1 MB (32 assets).

Para reducir el bundle:
- Considerar tree-shaking lucide-react (actualmente importa iconos completos)
- Framer-motion es ~40 KB — si el bundle es crítico, podría moverse a lazy load

### QR Signature

El hash QR usa un **SHA-256 simplificado en JS** (implementación propia, no crypto.subtle). Esto no es criptográficamente seguro para casos de uso de alta seguridad. Es suficiente para prevenir manipulaciones casual pero **no** para casos donde se requiera seguridad real.

### Offline

- El modo offline (localforage) solo funciona para **lectura de progreso local**
- No se pueden completar misiones offline (necesita RPC de Supabase)
- Las ofertas y misiones se cachean en el SW pero no se actualizan offline

### TypeScript

`noUnusedLocals: true` y `noUnusedParameters: true` están activos. Si declaras una variable/import que no usas, el build fallará. Esto es intencional para mantener el código limpio.

---

## Añadir Nuevas Funcionalidades

### Añadir una nueva página

1. Crear `src/pages/NuevaPagina.tsx`
2. Exportar default
3. Importar en `src/components/layout/AppRouter.tsx`
4. Añadir `Route` con lazy loading:

```tsx
const NuevaPagina = lazy(() => import('../../pages/NuevaPagina'))
// ...
<Route path="/nueva-pagina" element={<Layout><NuevaPagina /></Layout>} />
```

### Añadir una nueva tabla en Supabase

1. Añadir al SQL en `supabase/migrations/001_initial_schema.sql`
2. Definir tipos en `src/types/supabase.ts` (tabla + insert/update)
3. Añadir políticas RLS
4. Crear hook dedicado o extender existente
5. Crear componentes de UI para la tabla

### Añadir un nuevo rol

1. Añadir valor al ENUM `app_role` en SQL
2. Actualizar tipo en `src/lib/constants.ts` y `src/types/`
3. Añadir lógica condicional en componentes que проверяют `user.role`
4. No hay switch/case automático — se hace manualmente en cada componente

### Añadir un nuevo tipo de oferta

1. Añadir al ENUM `offer_type` en SQL
2. Añadir al array `offerTypes` en `src/components/admin/MissionForm.tsx`
3. Añadir label y icono en `src/components/merchant/OfferCard.tsx`

### Modificar sistema de rangos

1. Cambiar `RANK_THRESHOLDS` en `src/lib/constants.ts`
2. Cambiar función `calculate_rank` en `src/lib/rank-calculator.ts`
3. Cambiar función SQL `calculate_rank` en `supabase/migrations/001_initial_schema.sql`
4. Verificar que todos los `RANK_COLORS`, `RANK_NAMES` en constants.ts estén sincronizados

### Cambiar el tema de colores

1. Cambiar valores en `tailwind.config.js` (colors, fontFamily, animation)
2. Cambiar `@theme` en `src/styles/index.css` (si usa Tailwind 4, pero actualmente es v3)
3. Cambiar `COLORS` en `src/lib/constants.ts` si se usa ahí

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev          # Inicia Vite en http://localhost:5173
npm run build        # Build producción en dist/
npm run preview      # Preview del build producción

# TypeScript
npx tsc -b           # Check completo de tipos

# Limpieza
Remove-Item -Recurse node_modules, package-lock.json  # Windows
rm -rf node_modules package-lock.json                # Mac/Linux

# Re-instalar
npm install
```
