#!/usr/bin/env bash
# Instala el APK de release (Dirección H) en el Android conectado por USB.
# Uso:  bash mobile/install-apk.sh
set -e
cd "$(dirname "$0")"
source .android-build-env

APK="android/app/build/outputs/apk/release/app-release.apk"
[ -f "$APK" ] || { echo "No existe $APK — compílalo antes con: cd android && ./gradlew assembleRelease"; exit 1; }

echo "Esperando al dispositivo (activa depuración USB y acepta el diálogo)..."
adb wait-for-device
adb devices -l

# La firma cambia entre builds locales (debug.keystore regenerado por prebuild),
# así que se desinstala primero para evitar INSTALL_FAILED_UPDATE_INCOMPATIBLE.
adb uninstall com.joinly.app >/dev/null 2>&1 || true
adb install -r "$APK"
adb shell monkey -p com.joinly.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
echo "Instalado y lanzado: com.joinly.app"
