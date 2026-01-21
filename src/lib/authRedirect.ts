/**
 * Returns a public web URL for auth email redirects.
 *
 * Why: on mobile (Capacitor / in-app webview) the app origin is often localhost,
 * but email confirmation links must open a reachable public URL.
 */
const PUBLIC_APP_URL = "https://aarogyasri.lovable.app";

export const getPublicAppBaseUrl = (): string => {
  const origin = window.location.origin;

  const originLooksLocal =
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.startsWith("capacitor://") ||
    origin.startsWith("ionic://");

  // Lovable projects may not reliably expose VITE_* env vars at runtime;
  // use a stable published URL when running in local/webview contexts.
  if (originLooksLocal) return PUBLIC_APP_URL;
  return origin;
};

export const getAppRedirectUrl = (path: string): string => {
  const base = getPublicAppBaseUrl();
  return new URL(path, base).toString();
};
