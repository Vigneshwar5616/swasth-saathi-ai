/**
 * Returns a public web URL for auth email redirects.
 *
 * IMPORTANT: Always use the published URL for email redirects to ensure
 * users are redirected to a reachable public URL, not localhost or preview URLs.
 */
const PUBLIC_APP_URL = "https://aarogyasri.lovable.app";

/**
 * For auth email redirects, ALWAYS use the published URL.
 * This ensures email confirmation links work regardless of where signup occurred.
 */
export const getAppRedirectUrl = (path: string): string => {
  return new URL(path, PUBLIC_APP_URL).toString();
};

/**
 * Returns the current origin or falls back to public URL if on localhost/mobile.
 * Use this for non-auth purposes where current origin matters.
 */
export const getPublicAppBaseUrl = (): string => {
  const origin = window.location.origin;

  const originLooksLocal =
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.startsWith("capacitor://") ||
    origin.startsWith("ionic://");

  if (originLooksLocal) return PUBLIC_APP_URL;
  return origin;
};
