export const ANDROID_APK_URL =
  import.meta.env?.VITE_ANDROID_APK_URL ||
  'https://github.com/Adrian-Luerssen/Personal-Server/releases/latest/download/personal-server.apk';

let nativeMobileAppDetected = false;

export function isNativeMobileApp() {
  if (nativeMobileAppDetected) return true;
  if (typeof window === 'undefined') return false;
  if (import.meta.env?.VITE_NATIVE_APP === 'true') {
    nativeMobileAppDetected = true;
    return true;
  }
  if (window.__NATIVE_APP__ === true) {
    nativeMobileAppDetected = true;
    return true;
  }

  const capacitor = window.Capacitor;
  if (capacitor) {
    if (typeof capacitor.isNativePlatform === 'function') {
      nativeMobileAppDetected = Boolean(capacitor.isNativePlatform());
      return nativeMobileAppDetected;
    }
    if (typeof capacitor.getPlatform === 'function') {
      nativeMobileAppDetected = capacitor.getPlatform() !== 'web';
      return nativeMobileAppDetected;
    }
    if (capacitor.isNative) {
      nativeMobileAppDetected = true;
      return true;
    }
  }

  const protocol = window.location?.protocol;
  const hostname = window.location?.hostname;
  const nativeAssetOrigin =
    protocol === 'capacitor:' ||
    (import.meta.env?.PROD && hostname === 'localhost' && /Android/i.test(navigator.userAgent || ''));

  nativeMobileAppDetected = Boolean(nativeAssetOrigin);
  return nativeMobileAppDetected;
}

export function isMobileBrowser() {
  if (typeof window === 'undefined' || isNativeMobileApp()) return false;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
  const narrowCoarsePointer =
    window.matchMedia?.('(max-width: 767px) and (pointer: coarse)').matches;
  return mobileUa || Boolean(narrowCoarsePointer);
}
