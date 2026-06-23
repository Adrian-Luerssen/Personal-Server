export const ANDROID_APK_URL =
  import.meta.env?.VITE_ANDROID_APK_URL ||
  'https://github.com/Adrian-Luerssen/Personal-Server/releases/latest/download/personal-server.apk';

export function isNativeMobileApp() {
  if (typeof window === 'undefined') return false;
  const capacitor = window.Capacitor;
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === 'function') {
    return capacitor.isNativePlatform();
  }
  return Boolean(capacitor.isNative);
}

export function isMobileBrowser() {
  if (typeof window === 'undefined' || isNativeMobileApp()) return false;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
  const narrowCoarsePointer =
    window.matchMedia?.('(max-width: 767px) and (pointer: coarse)').matches;
  return mobileUa || Boolean(narrowCoarsePointer);
}
