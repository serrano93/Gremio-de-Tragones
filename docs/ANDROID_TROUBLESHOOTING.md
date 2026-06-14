# Android Troubleshooting

Problemas comunes con la build de Android y sus soluciones.

---

## Build

### "Cannot find module ... @capacitor/cli/bin/capacitor"

**Causa**: `node_modules` no se instaló completo o se borró parcialmente.

**Solución**:
```bash
cd C:\Users\serra\Desktop\OC\Gremio de Dragones
npm install
```

Si sigue fallando:
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

### "Could not read workspace metadata from .../transforms/.../metadata.bin"

**Causa**: Caché de Gradle corrupto (típico después de un `git reset --hard` o cambio de versión de Gradle).

**Solución**:
```powershell
# Cerrar procesos Java/Gradle
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force

# Borrar caché
Remove-Item -Recurse -Force $env:USERPROFILE\.gradle\caches\8.11.1
Remove-Item -Recurse -Force android\.gradle

# Rebuild
cd android
.\gradlew.bat assembleDebug
```

---

### "uses-sdk:minSdkVersion 24 cannot be smaller than version 26 declared in library ionbarcode-android"

**Causa**: El plugin `@capacitor/barcode-scanner@2.2.6` requiere minSdk 26 (Android 8.0).

**Solución**: Verifica que `android/variables.gradle` tenga:
```gradle
minSdkVersion = 26
```

---

### "JAVA_HOME is not set" o "no 'java' command could be found"

**Solución**:
```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\serra\AppData\Local\Android\Sdk", "User")
```

Cierra y reabre PowerShell para que tome efecto.

---

### "SDK location not found"

**Causa**: Falta `android/local.properties` con la ruta del SDK.

**Solución**: Crear el archivo (ya está gitignored):
```bash
"sdk.dir=C:\Users\serra\AppData\Local\Android\Sdk" | Out-File -FilePath android\local.properties -Encoding utf8
```

O ejecutar desde Android Studio la primera vez (lo crea automáticamente).

---

## Runtime (en el dispositivo)

### App abre pero pantalla en blanco

**Causa 1**: Build web no se sincronizó a Android.
**Solución**:
```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

**Causa 2**: `dist/` está vacío o corrupto.
**Solución**: Verifica que `dist/index.html` existe y se copia a `android/app/src/main/assets/public/index.html`.

**Causa 3**: Error de JavaScript en runtime (sin ver nada).
**Solución**: Conecta el móvil por USB y ejecuta:
```bash
adb logcat | findstr "chromium Console"
```

---

### Permiso de cámara denegado / Scanner no abre

**Causa**: El usuario denegó el permiso la primera vez.

**Solución en el dispositivo**:
1. Ajustes → Aplicaciones → Gremio de Tragones → Permisos
2. Activar "Cámara"

Si sigue fallando, desinstalar y volver a instalar (resetea permisos).

---

### Scanner abre pero no detecta QR

**Posibles causas**:
- QR muy pequeño o muy lejos → acércate
- QR impreso con baja calidad → usa pantalla de móvil/tablet
- Permiso de cámara revocado en runtime
- Foco de cámara no ajustó (esquina, baja luz) → apunta a zona bien iluminada

**Debug con logcat**:
```bash
adb logcat | findstr "BarcodeScanner"
```

---

### Splash se queda colgado / loop infinito

**Causa**: Error en `capacitor.config.ts` o plugin nativo que falla al cargar.

**Solución**:
1. Revisa `adb logcat` para el error exacto
2. Verifica que `capacitor.config.json` en `android/app/src/main/assets/` se regeneró:
   ```bash
   npx cap sync android
   Get-Content android\app\src\main\assets\capacitor.config.json
   ```
3. Compara con tu `capacitor.config.ts` raíz

---

## Despliegue / Instalación

### "App not installed" o "Package conflicts with existing package"

**Causa 1**: Hay una versión anterior con distinto `applicationId`.
**Solución**: Desinstalar la anterior primero (Ajustes → Aplicaciones → Gremio de Tragones → Desinstalar).

**Causa 2**: El certificado de firma cambió.
**Solución**: Cada build debug se firma con un cert distinto. Desinstalar y reinstalar.

**Causa 3**: Espacio insuficiente.
**Solución**: Liberar espacio en el móvil.

---

### Dos apps "Gremio de Tragones" instaladas

**Causa**: Cambió el `appId` entre builds.

**Solución**:
1. Desinstalar la versión vieja
2. Identificar cuál es cuál por icono o por el package name (en Ajustes → Aplicaciones)

---

## Git / Rama

### "Your branch and 'origin/feature/android' have diverged"

**Causa**: Commits locales sin pushear, o pusheaste desde otra máquina.

**Solución segura** (mantiene tus cambios):
```bash
git pull --rebase origin feature/android
```

**Solución rápida** (descarta tus cambios remotos):
```bash
git reset --hard origin/feature/android
```

---

### Cambié algo en main y quiero traerlo a feature/android

```bash
# Desde feature/android
git merge main
# Resolver conflictos si los hay
git push origin feature/android
```

---

## Build cache

### Build se queda colgado o tarda muchísimo

**Causa**: Primera build descarga Gradle (~150 MB) + Android SDK + dependencias npm.

**Builds subsecuentes**: <30 segundos.

**Si se cuelga en una build posterior**:
```powershell
# Matar todo
Get-Process java, gradle, node -ErrorAction SilentlyContinue | Stop-Process -Force

# Limpiar caches
Remove-Item -Recurse -Force $env:USERPROFILE\.gradle\caches -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue

# Rebuild
npm install
cd android
.\gradlew.bat assembleDebug
```

---

## Errores específicos que hemos visto

### "Cannot use JSX unless the '--jsx' flag is provided"

**Causa**: TypeScript mal configurado o falta reinstalar.
**Solución**: Verificar `tsconfig.app.json` tiene `"jsx": "react-jsx"`. Si está, `Remove-Item -Recurse -Force node_modules\.tmp` y rebuild.

---

### "EBUSY: resource busy or locked" en npm install

**Causa**: Hay procesos Java/Gradle usando archivos.

**Solución**:
```powershell
Get-Process java, gradle -ErrorAction SilentlyContinue | Stop-Process -Force
# Esperar 5 segundos
Start-Sleep -Seconds 5
npm install
```

---

## Obtener ayuda

Si nada de esto funciona:

1. **Captura el log completo**:
   ```bash
   cd android
   .\gradlew.bat assembleDebug --stacktrace 2>&1 | Out-File build-error.log
   ```

2. **Busca el error en Google** con el mensaje exacto + "capacitor 7" o "android gradle"

3. **Issues de Capacitor**: https://github.com/ionic-team/capacitor/issues

4. **Issues de barcode-scanner**: https://github.com/ionic-team/capacitor-barcode-scanner/issues

---

## Contacto rápido con el agente AI

Si le pides ayuda al agente, incluye:
- Rama actual: `git branch --show-current`
- Output completo del build fallido
- Versión de Node: `node --version`
- Versión de Java: `java -version`
- Última acción antes del error
