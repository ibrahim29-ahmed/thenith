/**
 * Lightweight, safe server-side HTML sanitizer for policy rich-text content.
 * Prevents XSS, script injection, and unsafe embeds without external heavy dependencies.
 */

const ALLOWED_TAGS = new Set([
  "p", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li", "blockquote",
  "a", "br", "span", "div", "hr", "code", "pre"
]);

export function sanitizeHtml(input) {
  if (!input || typeof input !== "string") return "";

  let html = input;

  // 1. Strip all <script>...</script> tags and contents completely
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 2. Strip all <style>...</style> tags and contents completely
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 3. Strip iframes, objects, embeds, forms
  html = html.replace(/<\/?(iframe|object|embed|form|input|button|textarea|meta|link|base|applet)\b[^>]*>/gi, "");

  // 4. Clean attributes inside tags
  html = html.replace(/<([a-z0-9]+)(\s+[^>]*)?>/gi, (match, tagName, attrsStr) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return ""; // Disallowed tag -> remove
    }

    if (!attrsStr) {
      return `<${tag}>`;
    }

    // Parse attributes safely
    let cleanAttrs = "";

    // If tag is 'a', extract href
    if (tag === "a") {
      const hrefMatch = attrsStr.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if (hrefMatch) {
        const rawHref = (hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || "").trim();
        const lowerHref = rawHref.toLowerCase();
        // Prevent javascript:, vbscript:, data: URIs
        if (
          lowerHref.startsWith("http://") ||
          lowerHref.startsWith("https://") ||
          lowerHref.startsWith("mailto:") ||
          lowerHref.startsWith("tel:") ||
          lowerHref.startsWith("/") ||
          lowerHref.startsWith("#")
        ) {
          cleanAttrs += ` href="${rawHref.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer"`;
        }
      }
    }

    // Keep safe text direction dir="rtl" or dir="ltr" if present
    const dirMatch = attrsStr.match(/\bdir\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (dirMatch) {
      const dirVal = (dirMatch[1] || dirMatch[2] || dirMatch[3] || "").toLowerCase();
      if (dirVal === "rtl" || dirVal === "ltr") {
        cleanAttrs += ` dir="${dirVal}"`;
      }
    }

    // Keep safe text alignment in class or style if needed
    const classMatch = attrsStr.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (classMatch) {
      const className = (classMatch[1] || classMatch[2] || classMatch[3] || "").replace(/[^a-zA-Z0-9_\-\s]/g, "");
      if (className) {
        cleanAttrs += ` class="${className}"`;
      }
    }

    return `<${tag}${cleanAttrs}>`;
  });

  // 5. Clean disallowed closing tags
  html = html.replace(/<\/([a-z0-9]+)>/gi, (match, tagName) => {
    const tag = tagName.toLowerCase();
    return ALLOWED_TAGS.has(tag) ? `</${tag}>` : "";
  });

  return html.trim();
}

export default { sanitizeHtml };

