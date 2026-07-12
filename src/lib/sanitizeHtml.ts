/**
 * Email-oriented HTML sanitizer for paste / external HTML entry points.
 *
 * Strips common unsafe patterns (scripts, event handlers, dangerous URLs).
 * Not a general XSS proof — hosts must still treat untrusted HTML carefully.
 *
 * TODO (plan 020): allow `data-variable` and `contenteditable="false"` on
 * merge-tag chip spans when that feature lands.
 */

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "DIV",
  "SPAN",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "H1",
  "H2",
  "H3",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "A",
  "IMG",
  "FONT",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TD",
  "TH",
]);

/** Tags removed entirely (including descendants) — active / non-email content. */
const REMOVE_ENTIRELY = new Set([
  "SCRIPT",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "FORM",
  "INPUT",
  "BUTTON",
  "SELECT",
  "TEXTAREA",
  "LINK",
  "META",
  "STYLE",
  "SVG",
  "MATH",
  "BASE",
  "NOSCRIPT",
  "TEMPLATE",
]);

const ALLOWED_ATTRS = new Set([
  "href",
  "src",
  "alt",
  "width",
  "height",
  "style",
  "target",
  "colspan",
  "rowspan",
  // <font> path used by execFontSize
  "size",
  "face",
  "color",
  // TODO plan 020: "data-variable", "contenteditable"
]);

/** Safe CSS property names commonly used in email HTML. */
const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "background-color",
  "background",
  "width",
  "height",
  "max-width",
  "min-width",
  "line-height",
  "border",
  "border-width",
  "border-style",
  "border-color",
  "border-collapse",
  "vertical-align",
  "display",
  "white-space",
]);

/** Full-string merge tag, e.g. `{{unsubscribe}}` or `{{ user.url }}`. */
const MERGE_TAG_RE = /^\{\{[^}]+\}\}$/;

/**
 * Return true when `url` is acceptable for href/src in email HTML.
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (MERGE_TAG_RE.test(trimmed)) return true;

  // Anchors and common relative forms (no scheme)
  if (trimmed.startsWith("#")) return true;

  const lower = trimmed.toLowerCase();

  // Explicit rejects (scheme-based)
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:text/html")
  ) {
    return false;
  }

  if (lower.startsWith("data:image/")) return true;
  if (/^https?:/i.test(trimmed)) return true;
  if (/^mailto:/i.test(trimmed)) return true;
  if (/^cid:/i.test(trimmed)) return true;

  // Protocol-relative URLs (//cdn.example.com) — common in email, not scriptable here
  if (trimmed.startsWith("//")) {
    // Reject //javascript:… style oddities
    if (/^\/\/\s*javascript:/i.test(trimmed)) return false;
    return true;
  }

  // Any other explicit scheme is rejected
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return false;
  }

  // Relative path without scheme (./x, ../x, images/x, path?q=1)
  return true;
}

/**
 * Return a trimmed safe URL, or `null` if unsafe / empty.
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  return isSafeUrl(trimmed) ? trimmed : null;
}

function sanitizeStyleValue(style: string): string | null {
  const raw = style.trim();
  if (!raw) return null;

  // Reject known dangerous constructs regardless of property name
  if (
    /expression\s*\(/i.test(raw) ||
    /url\s*\(\s*['"]?\s*javascript:/i.test(raw) ||
    /-moz-binding/i.test(raw) ||
    /behavior\s*:/i.test(raw) ||
    /@import/i.test(raw)
  ) {
    // Drop the entire style attribute when it contains known-bad constructs
    // (safer than trying to partially parse)
    // Still try to keep safe declarations if we can filter them.
  }

  const kept: string[] = [];
  // Split on `;` but ignore empty trailing segments
  for (const part of raw.split(";")) {
    const decl = part.trim();
    if (!decl) continue;
    const colon = decl.indexOf(":");
    if (colon <= 0) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (!value) continue;
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (
      /expression\s*\(/i.test(value) ||
      /url\s*\(\s*['"]?\s*javascript:/i.test(value) ||
      /-moz-binding/i.test(value) ||
      /behavior/i.test(value)
    ) {
      continue;
    }
    kept.push(`${prop}: ${value}`);
  }

  return kept.length > 0 ? kept.join("; ") : null;
}

function sanitizeElementAttributes(el: Element): void {
  // Snapshot attribute names — live NamedNodeMap mutates as we remove
  const names = Array.from(el.attributes).map((a) => a.name);

  for (const name of names) {
    const lower = name.toLowerCase();

    // Always strip event handlers and namespaced/exotic attrs
    if (lower.startsWith("on") || lower === "srcdoc" || lower.includes(":")) {
      el.removeAttribute(name);
      continue;
    }

    if (!ALLOWED_ATTRS.has(lower)) {
      el.removeAttribute(name);
      continue;
    }

    if (lower === "href" || lower === "src") {
      const safe = sanitizeUrl(el.getAttribute(name) ?? "");
      if (safe === null) {
        // Policy: remove dangerous href/src rather than unwrap the element
        el.removeAttribute(name);
      } else {
        el.setAttribute(name, safe);
      }
      continue;
    }

    if (lower === "style") {
      const cleaned = sanitizeStyleValue(el.getAttribute("style") ?? "");
      if (cleaned === null) {
        el.removeAttribute("style");
      } else {
        el.setAttribute("style", cleaned);
      }
      continue;
    }

    if (lower === "target") {
      const t = (el.getAttribute("target") ?? "").trim().toLowerCase();
      // Only allow common safe targets
      if (t !== "_blank" && t !== "_self") {
        el.removeAttribute("target");
      }
    }
  }
}

function walkAndSanitize(node: Node): void {
  // Iterate children as a static list so removals are safe
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toUpperCase();

      // Namespaced or unknown Word junk (e.g. O:P) — unwrap
      if (tag.includes(":") || tag.startsWith("O:")) {
        unwrapElement(el);
        continue;
      }

      if (REMOVE_ENTIRELY.has(tag)) {
        el.remove();
        continue;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        // Keep text/children of unknown tags (e.g. <o:p>, custom wrappers)
        unwrapElement(el);
        continue;
      }

      sanitizeElementAttributes(el);
      walkAndSanitize(el);
    } else if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
    }
    // Text / other nodes: keep
  }
}

/** Replace element with its children (preserve content of non-allowlisted tags). */
function unwrapElement(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  // Sanitize/process children first so nested junk is cleaned
  walkAndSanitize(el);
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

/**
 * Sanitize HTML for email editor use: allowlist tags/attrs, safe URLs, safe styles.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  walkAndSanitize(body);

  return body.innerHTML;
}
