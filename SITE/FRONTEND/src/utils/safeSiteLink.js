export function getSafeSiteLink(value) {
  if (typeof value !== "string") return "";

  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  if (raw.startsWith("#")) return raw;

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(raw);
  if (hasScheme && !/^https?:\/\//i.test(raw)) return "";

  const candidate = raw.startsWith("//")
    ? `https:${raw}`
    : hasScheme
      ? raw
      : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";

    const hostname = url.hostname.toLowerCase();
    const isLocalhost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
    if (url.protocol === "http:" && !isLocalhost) url.protocol = "https:";

    return url.href;
  } catch {
    return "";
  }
}