# Android Build — Quickstart

> Rama: `feature/android` · Web/PWA: `main` (no se toca)

## Estado actual

| Concepto | Valor |
|----------|-------|
| App ID | `com.gremio.tragones` |
| App name (visible) | Gremio de Tragones |
| Capacitor | 7.1.2 |
| Barcode Scanner | 2.2.6 |
| Plugins | app, preferences, splash-screen, status-bar |
| minSdk | 26 (Android 8.0+) |
| targetSdk | 35 (Android 15) |
| compileSdk | 35 |
| Gradle | 8.11.1 |
| Java | 21 (de Android Studio) |
| APK debug | 43.8 MB |

---

## Requisitos en tu máquina

| Software | Versión | Notas |
|----------|---------|-------|
| Node.js | 20.18 o 22.x | Esta rama NO requiere Node 22+ (Capacitor 7 sí) |
| Java JDK | 21 | Instalado vía Android Studio (`jbr/`) |
| Android Studio | Hedgehog+ | Trae Gradle, SDK manager, emulador |
| Android SDK | 35 | Platform + Build Tools |
| ANDROID_HOME | `C:\Users\serra\AppData\Local\Android\Sdk` | Ya configurado |

### Variables de entorno (si no están)

```powershell
# Una sola vez
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\serra\AppData\Local\Android\Sdk", "User")
```

---

## Estructura del proyecto Android

```
android/
├── app/
│   ├── build.gradle                    # applicationId + namespace
│   ├── src/main/
│   │   ├── AndroidManifest.xml         # Permisos: CAMERA, INTERNET, VIBRATE
│   │   ├── java/com/gremio/tragones/
│   │   │   └── MainActivity.java       # BridgeActivity de Capacitor
│   │   ├── res/
│   │   │   ├── values/strings.xml      # app_name, package_name
│   │   │   ├── values/colors.xml       # slate-900 + dorado
│   │   │   ├── values/styles.xml       # AppTheme + NoActionBarLaunch
│   │   │   ├── xml/network_security_config.xml  # cleartext localhost
│   │   │   ├── mipmap-*/               # Iconos app (6 densidades)
│   │   │   └── drawable-*/splash.png   # Splash screens
│   │   └── assets/
│   │       ├── public/                 # Build web (regenerado por cap sync)
│   │       ├── capacitor.config.json
│   │       └── capacitor.plugins.json
│   └── build/outputs/apk/debug/
│       └── app-debug.apk               # Tu APK
├── variables.gradle                    # minSdk=26, targetSdk=35
├── local.properties                    # sdk.dir (gitignored)
└── gradle/wrapper/
```

---

## Build desde cero (orden de comandos)

### 1. Build web assets (en raíz del proyecto)

```bash
npm run build
```

Genera `dist/` con la PWA optimizada.

### 2. Sincronizar con Android

```bash
npx cap sync android
```

Copia `dist/` a `android/app/src/main/assets/public/` y actualiza plugins.

### 3. Compilar APK debug

```powershell
cd android
.\gradlew.bat assembleDebug
```

Resultado: `android/app/build/outputs/apk/debug/app-debug.apk` (~44 MB)

### 4. Instalar en dispositivo (con USB debugging)

```powershell
cd android
.\gradlew.bat installDebug
```

### 5. APK de respaldo (opcional)

```bash
# En raíz del proyecto
mkdir dist-releases
cp android/app/build/outputs/apk/debug/app-debug.apk \
   dist-releases/gremio-de-tragones-debug-1.0.0.apk
```

---

## Regenerar después de cambios

| Si modificas... | Ejecuta... |
|-----------------|------------|
| Código PWA (React, CSS, hooks) | `npm run build && npx cap sync android` |
| `capacitor.config.ts` | `npx cap sync android` |
| `AndroidManifest.xml`, permisos | `npx cap sync android` (relee config) |
| `res/`, iconos, splash | `npx cap-assets generate --android` (si tienes assets/) |
| Código nativo Java/Kotlin | Edita y `cd android && .\gradlew.bat assembleDebug` |
| Versión (`versionCode`/`versionName`) | Edita `android/app/build.gradle` |

---

## Probar en dispositivo físico

### Habilitar USB debugging en el móvil

1. **Ajustes → Acerca del teléfono** → Toca "Número de compilación" 7 veces
2. **Ajustes → Opciones de desarrollador** → Activar "Depuración por USB"
3. Conecta por USB y acepta el diálogo de confianza

### Verificar conexión

```bash
adb devices
# Debe listar tu dispositivo
```

### Instalar APK manualmente (sin Android Studio)

1. Copia `app-debug.apk` al móvil (USB, Drive, email)
2. En el móvil: habilita "Instalar apps de fuentes desconocidas" para tu navegador/gestor de archivos
3. Abre el APK y acepta instalar
4. Si te pide desinstalar versión anterior: hazlo (el appId es el mismo pero el certificado debug es distinto cada vez)

---

## Comandos útiles

```bash
# Ver logs en tiempo real
adb logcat | findstr "Capacitor Gremio"

# Limpiar build cache si algo se corrompe
cd android
.\gradlew.bat clean

# Build + install + run con livereload (útil para debug)
npx cap run android --livereload

# Ver todas las tareas gradle disponibles
cd android
.\gradlew.bat tasks
```

---

## Troubleshooting

Ver [`docs/ANDROID_TROUBLESHOOTING.md`](./docs/ANDROID_TROUBLESHOOTING.md) para problemas comunes.

Ver [`docs/ANDROID_ARCHITECTURE.md`](./docs/ANDROID_ARCHITECTURE.md) para decisiones técnicas.
