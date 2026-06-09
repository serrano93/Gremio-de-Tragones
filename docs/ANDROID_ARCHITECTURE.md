# Android Architecture — Decisiones Técnicas

> Por qué se eligieron estas opciones y qué alternativas había

---

## Stack elegido

| Capa | Tecnología | Versión | Razón |
|------|-----------|---------|-------|
| Wrapper nativo | Capacitor | 7.1.2 | Más maduro que Cordova, mejor integración con frameworks modernos |
| Scanner QR | @capacitor/barcode-scanner | 2.2.6 | API nativa, sin permisos extra en Android 13+ |
| Lenguaje nativo | Java | 21 | Compatible con Android Studio Hedgehog+, requerido por AGP 8.x |
| Build system | Gradle | 8.11.1 | Incluido por Capacitor 7, compatible con Java 21 |
| Min Android | API 26 | Android 8.0 | Requerido por ionbarcode-android v2.0.1 |
| Target Android | API 35 | Android 15 | Última versión estable al desarrollar |

---

## Decisiones clave

### ¿Por qué Capacitor y no Cordova / React Native / Flutter?

**Capacitor** porque:
- **Mismo código web que la PWA** (no duplicar React app)
- **Bridge simple** entre WebView y nativo
- **APK instalable** sin cambios arquitecturales drásticos
- **Migración reversible** (borrar android/ y vuelves a PWA pura)
- **Mejor DX** que Cordova (TypeScript-first, mejor CLI)

**Alternativas descartadas**:
- **Cordova**: Legacy, más fricción con build moderno
- **React Native**: Reescribir la app entera en RN, no vale para nuestro caso
- **Flutter**: Idem, además suma otro lenguaje (Dart)
- **TWA (Trusted Web Activity)**: No permite scanner nativo, solo Chrome

---

### ¿Por qué minSdk 26 (no 24, no 21)?

- **24 (Android 7.0)**: Lo que sugiere Capacitor por defecto, pero el plugin de barcode lo rechaza
- **26 (Android 8.0)**: Requerido por `ionbarcode-android` v2.0.1 (librería nativa MLKit/ZXing)
- **Cobertura**: Android 8.0+ cubre >97% del mercado activo (2026)

Decidimos subir a 26 antes que hacer workarounds con `tools:overrideLibrary`.

---

### ¿Por qué Capacitor 7 y no 8?

| Aspecto | Cap 7 | Cap 8 |
|---------|-------|-------|
| Node mínimo | 18+ | 22+ |
| barcode-scanner | 2.2.6 estable | 3.0.2 con API distinta |
| Documentación | Maduro | Reciente, menos ejemplos |
| targetSdk | 35 (Android 15) | 36 (Android 16) |
| Producción | Probado | Menos extendido |

**Decisión**: Quedarse en Cap 7 hasta que el ecosistema madure. Migrar a Cap 8 es mecánico:
- Cambiar versiones en `package.json`
- Re-ejecutar `npx cap add android`
- Adaptar `useQRScan.ts` al nuevo API de barcode-scanner
- Recompilar

Tiempo estimado de migración: 20-30 minutos.

---

### ¿Por qué PWA como base, no RN-style?

**Lo que se mantiene igual**:
- React 18.3.1
- TypeScript estricto
- Vite como bundler
- Tailwind CSS
- Estructura de carpetas (src/, components/, hooks/, lib/, pages/)
- Supabase JS client (vía direct fetch para evitar problemas)
- Toda la lógica de negocio

**Lo que se añade solo en rama `feature/android`**:
- Carpeta `android/` con proyecto nativo
- `capacitor.config.ts`
- `useQRScan` extendido con scanner nativo (fallback a html5-qrcode en web)

**Beneficio**: Un solo codebase, dos artefactos. Si Android no funciona, la PWA sigue 100%.

---

### ¿Por qué scanner nativo y no web (html5-qrcode) en móvil?

| Aspecto | Nativo (Capacitor) | Web (html5-qrcode) |
|---------|--------------------|--------------------|
| Velocidad | <500ms | 1-3s |
| UI | Botón "Cancelar" nativo del SO | Botón HTML custom |
| Permisos | Una vez, gestionado por el SO | Cada carga pide permiso |
| UX | "App real" | "Web en contenedor" |
| Funciona offline | Sí | Sí |
| Tamaño bundle | N/A (plugin nativo) | +200KB en JS |

**Decisión**: Usar nativo en móvil, html5-qrcode en web. El hook `useQRScan` detecta `Capacitor.isNativePlatform()` y elige.

---

### ¿Por qué `window.Capacitor` en vez de import estático?

**Problema**: Si `useQRScan` hace `import { Capacitor } from '@capacitor/core'`, el bundle web incluye el runtime de Capacitor (~30KB) innecesariamente.

**Solución**: Detectar en runtime:
```typescript
const cap = window.Capacitor
if (cap?.isNativePlatform?.()) { ... }
```

**Beneficio**:
- Bundle web: -30KB de runtime innecesario
- Funciona en nativo (Capacitor se auto-inyecta en `window` al cargar)
- Funciona en web (`window.Capacitor` es undefined → fallback)

---

### ¿Por qué SHA-256 server-side fallback en `qr-utils.ts`?

**Problema teórico**: `crypto.subtle` no funciona en HTTP (requiere HTTPS o localhost).

**Defensa en profundidad**: Si por algún motivo falla (WebView antigua, proxy raro), tenemos fallback a RPC `sign_qr_payload` en Supabase.

**Decisión**: Mantener el fallback porque:
- No cuesta mucho (una llamada extra en caso de error)
- Garantiza que el QR siempre se puede generar
- La migración 010 ya está aplicada en Supabase

**Nota**: En la práctica, Vercel sirve por HTTPS y los móviles en WebView también, así que `crypto.subtle` siempre funciona. El fallback es para casos extremos.

---

### ¿Por qué `useQRScan` es un hook y no un componente?

**Ventajas del hook**:
- Reutilizable en múltiples componentes (no solo ScanPage)
- Permite lógica compartida entre web/native
- Estado del scanner vive donde lo necesita el componente
- Más fácil de testear

**Desventaja**:
- Acopla el componente a la API del hook

Decidimos hook porque la lógica de "qué scanner usar" es transversal y queremos DRY.

---

## Estructura de archivos: ¿por qué así?

```
feature/android/
├── android/                      # Proyecto Gradle nativo (ignora build/)
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml   # Permisos
│   │   ├── java/...tragones/     # Código nativo Java
│   │   ├── res/                  # Recursos Android
│   │   └── assets/public/        # Build web (regenerado por cap sync)
│   └── build.gradle              # Config Gradle
├── capacitor.config.ts            # Config Capacitor (punto único de verdad)
├── dist/                         # Build web (ignorado)
├── dist-releases/                # APKs de respaldo (ignorado)
└── assets/                       # Iconos fuente para capacitor-assets (ignorado)
```

**Reglas**:
1. **No tocar `android/app/src/main/assets/public/`** manualmente (lo regenera cap sync)
2. **No commitear `android/build/` o `android/.gradle/`** (caches)
3. **`capacitor.config.ts` es la fuente de verdad** para appId, plugins, etc.
4. **`dist/` se regenera** con `npm run build`

---

## ¿Por qué `feature/android` y no trabajar en `main`?

**Razones**:
1. **Aislamiento**: Cambios en Android no afectan builds de Vercel
2. **Review**: PRs separados para web vs Android
3. **Rollback**: Si Android falla, `main` sigue intacto
4. **CI/CD futuro**: Vercel puede deployar `main`, Android se compila en otro lado
5. **Honra el principio "PWA primero"** que pediste

**Trade-off**:
- Si añades un feature nuevo en `main` (ej: nuevo componente), hay que mergearlo a `feature/android` antes de generar APK
- Es overhead pequeño, vale la pena por el aislamiento

---

## Limitaciones conocidas

1. **Solo Android**: iOS requiere Mac (no soportamos en este setup)
2. **Solo APK debug**: No hay keystore de release todavía
3. **No hay tests E2E**: Solo build manual + smoke test en dispositivo
4. **No hay CI**: Build se hace local (o se podría añadir GitHub Actions)
5. **Firma debug cambia cada build**: Cada `assembleDebug` genera un cert distinto

---

## Roadmap (orden sugerido)

1. **Inmediato** (ya hecho): APK debug instalable, scanner funcional
2. **Corto plazo**: Probar scanner con QR real en dispositivo
3. **Medio plazo**: Generar keystore + APK release firmado
4. **Largo plazo**:
   - GitHub Actions para build automático
   - Migrar a Capacitor 8 cuando el ecosystem madure
   - Publicar en Play Store (AAB firmado)
5. **Nunca** (probablemente): iOS (requiere Mac + Xcode)

---

## Conceptos que NO están en esta rama

- **Service Worker offline** (vite-plugin-pwa): El WebView nativo no lo usa, pero se incluye en el bundle. Inofensivo.
- **PWA manifest** (manifest.webmanifest): Ignorado en nativo. No afecta.
- **`@capacitor/preferences`**: Instalado pero no usado actualmente. Disponible para futuro (almacenamiento nativo).
