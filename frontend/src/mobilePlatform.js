export const ANDROID_APK_URL =
  import.meta.env?.VITE_ANDROID_APK_URL ||
  'https://github.com/Adrian-Luerssen/Personal-Server/releases/download/android-latest/personal-server.apk';

export function isNativeMobileApp() {
  if (typeof window === 'undefined') return false;
  if (import.meta.env?.VITE_NATIVE_APP === 'true') return true;
  if (window.__NATIVE_APP__ === true) return true;

  const capacitor = window.Capacitor;
  if (capacitor) {
    if (typeof capacitor.isNativePlatform === 'function') {
      return capacitor.isNativePlatform();
    }
    if (typeof capacitor.getPlatform === 'function') {
      return capacitor.getPlatform() !== 'web';
    }
    if (capacitor.isNative) return true;
  }

  const protocol = window.location?.protocol;
  const hostname = window.location?.hostname;
  const nativeAssetOrigin =
    protocol === 'capacitor:' ||
    (import.meta.env?.PROD && hostname === 'localhost' && /Android/i.test(navigator.userAgent || ''));

  return Boolean(nativeAssetOrigin);
}

export function isMobileBrowser() {
  if (typeof window === 'undefined' || isNativeMobileApp()) return false;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
  const narrowCoarsePointer =
    window.matchMedia?.('(max-width: 767px) and (pointer: coarse)').matches;
  return mobileUa || Boolean(narrowCoarsePointer);
}
