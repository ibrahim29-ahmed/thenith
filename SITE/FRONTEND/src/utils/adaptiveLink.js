/**
 * Resolves link paths based on user authentication state:
 * - If logged in: /u/:path (e.g., /u/products, /u/cart, /u/checkout, /u/custom-card)
 * - If guest: /:path (e.g., /products, /cart, /checkout, /custom-card)
 */
export function getAdaptiveLink(path, isAuthenticated) {
  if (!path) return isAuthenticated ? "/u" : "/";
  const clean = path.startsWith("/") ? path : `/${path}`;

  // If path already starts with /u/
  if (clean.startsWith("/u/")) {
    return isAuthenticated ? clean : clean.replace(/^\/u/, "") || "/";
  }

  // Paths that only exist inside user panel
  const panelOnlyTabs = ["cards", "messages", "subscriptions", "profile", "support", "link-card"];
  const firstSegment = clean.slice(1).split("/")[0].split("?")[0];
  if (panelOnlyTabs.includes(firstSegment)) {
    return isAuthenticated ? `/u${clean}` : `/login?returnTo=${encodeURIComponent(`/u${clean}`)}`;
  }

  return isAuthenticated ? `/u${clean}` : clean;
}

