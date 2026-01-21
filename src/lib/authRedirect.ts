/**
 * Returns a public web URL for auth email redirects.
 *
 * Why: on mobile (Capacitor / in-app webview) the app origin is often localhost,
 * but email confirmation links must open a reachable public URL.
 */
export const getPublicAppBaseUrl = (): string => {
  const origin = window.location.origin;
  const envUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, "");

  const originLooksLocal =
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.startsWith("capacitor://") ||
    origin.startsWith("ionic://");

  if (originLooksLocal && envUrl) return envUrl;
  return origin;
};

export const getAppRedirectUrl = (path: string): string => {
  const base = getPublicAppBaseUrl();
  return new URL(path, base).toString();
};
