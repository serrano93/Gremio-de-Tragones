# Gremio de Tragones

PWA de gamificación medieval con sistema de recompensas por visitas a establecimientos.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite 5 + React 18 + TypeScript 5 |
| Estilos | Tailwind CSS 3 |
| Animaciones | Framer Motion 11 |
| Backend/DB | Supabase (Auth, PostgreSQL, RLS, RPC) |
| PWA | vite-plugin-pwa (Service Worker, manifest) |
| QR | qrcode.react + html5-qrcode |
| Offline | localforage (IndexedDB) |
| Iconos | Lucide React |
| Fuentes | Google Fonts (Cinzel + Inter) |

## Estructura

```
src/
├── components/
│   ├── layout/     # AppRouter, BottomNav, TopBar, GuestBanner
│   ├── ui/         # Button, Card, Badge, XPBar, Modal, Toast
│   ├── missions/   # MissionCard, MissionQRGenerator, MissionList
│   ├── guild/      # RankBadge, RankProgress
│   ├── merchant/   # MerchantScanner, EstablishmentCard, OfferCard
│   └── admin/      # AdminDashboard, MissionForm (incluye OfferForm)
├── hooks/          # useAuth, useGuestSync, useMissions, useRank, useQRScan, useEstablishments, useOffers
├── lib/            # supabase, storage, constants, rank-calculator, qr-utils
├── pages/          # 9 páginas con lazy loading
├── types/          # Tipos BD Supabase + tipos app
└── styles/         # Tailwind + utilidades temáticas
```

## Configuración rápida

### 1. Supabase (PROYECTO NUEVO)

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta TODO el contenido de:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. En **Authentication > Providers**:
   - Activa **Email/Password** (desactiva "Confirm email" si quieres pruebas sin verificación)
   - Para **Google OAuth**: haz clic en Google y añade:
     - **Client ID** de Google Cloud Console
     - **Client Secret** de Google Cloud Console
     - En Google Cloud Console, añade tu URL de Supabase a "Authorized redirect URIs"
       (ej: `https://tu-proyecto.supabase.co/auth/v1/callback`)
4. Copia `URL` y `anon key` de **Settings > API**

### 2. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 3. Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`

### 4. Deploy en Vercel (GRATIS)

```bash
npm i -g vercel
vercel
```

O conecta el repo en [vercel.com](https://vercel.com):
- Framework: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Variables de entorno: mismas que `.env`

### 5. Deploy en Netlify (alternativa GRATIS)

- Build command: `npm run build`
- Publish directory: `dist`

## Rangos del Gremio

| Rango | XP | Nombre |
|-------|----|--------|
| F | 0 | Iniciado (invitado) |
| E | 100 | Explorador |
| D | 300 | Defensor |
| C | 600 | Capitán |
| B | 1000 | Barón |
| A | 1600 | Archimago |
| S | 2500+ | Señor Dragón |

## Flujos principales

### Invitado → Aventurero
1. Usuario abre la app sin login (Rango F, progreso en IndexedDB)
2. Completa misiones ficticias (simuladas localmente)
3. Se registra en Perfil → su XP se migra a Supabase
4. Si XP >= 100, obtiene Rango E automáticamente

### Verificación QR (Comerciante escanea aventurero)
1. Aventurero con sesión abre misión → genera QR (firma SHA-256, expira 2 min)
2. Comerciante (rol `merchant`) va a `/scan` → escanea con cámara
3. App envía payload a RPC `verify_and_complete_mission`
4. RPC valida: firma, timestamp < 2 min, misión existe, no duplicada
5. Otorga XP, crea registro `visits`, actualiza rango automáticamente

### Admin
1. Admin (`role='admin'`) crea establecimientos y asigna `owner_id`
2. Crea misiones y ofertas vinculadas a establecimientos
3. Monitorea actividad del gremio

## Probar instalación PWA

### Android
1. Abre la app desplegada en Chrome
2. Menú (3 puntos) → "Añadir a pantalla de inicio" o "Instalar aplicación"
3. El banner `beforeinstallprompt` se captura automáticamente

### iOS
1. Abre en Safari
2. Botón Compartir → "Añadir a pantalla de inicio"
3. La app se instala con icono, splash y modo standalone

### Lighthouse PWA
```bash
npx lighthouse <url> --view --preset=desktop
```

Debe alcanzar >= 90 en PWA con la configuración actual.

## Seguridad

- RLS activado en **todas** las tablas
- Políticas por rol: admin ALL, merchant OWN establishments, adventurer READ activos
- RPC con `SECURITY DEFINER` para operaciones privilegiadas
- Auth: Supabase Email/Password + Google OAuth
- QR firmado con hash (no criptográfico pero suficiente para el caso de uso)

## Licencia

MIT — Uso libre. Assets SVG con licencia CC0 de OpenGameArt/Wikimedia.
