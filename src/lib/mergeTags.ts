import type { Variable } from "../types";

/** Generic merge-token shape: `{{…}}` with no nested braces. */
const MERGE_TOKEN_RE = /\{\{[^}]+\}\}/g;

const CHIP_CLASS = "ree-merge-tag";

/**
 * Build a non-editable merge-tag chip for insertion into the contenteditable.
 * Display shows `label` (or `value` if label is empty); the raw token lives in
 * `data-merge-tag` for serialization.
 */
export function createMergeTagElement(variable: {
  label: string;
  value: string;
}): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = CHIP_CLASS;
  el.contentEditable = "false";
  el.dataset.mergeTag = variable.value;
  el.title = variable.value;
  el.textContent = variable.label || variable.value;
  return el;
}

/** True when `node` is a merge-tag chip element. */
export function isMergeTagNode(node: Node): boolean {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).classList.contains(CHIP_CLASS) &&
    (node as HTMLElement).dataset.mergeTag != null
  );
}

function labelForToken(token: string, variables: Variable[]): string {
  const match = variables.find((v) => v.value === token);
  return match?.label || token;
}

/**
 * Walk text nodes under `root` and wrap merge tokens in chip spans.
 * Skips text already inside a chip (avoids double-hydration).
 */
function hydrateTextNodes(root: Node, variables: Variable[]): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  for (const textNode of textNodes) {
    // Skip text already inside a chip
    let ancestor: Node | null = textNode.parentNode;
    while (ancestor && ancestor !== root) {
      if (isMergeTagNode(ancestor)) break;
      ancestor = ancestor.parentNode;
    }
    if (ancestor && ancestor !== root && isMergeTagNode(ancestor)) {
      continue;
    }

    const text = textNode.nodeValue ?? "";
    if (!text.includes("{{")) continue;

    MERGE_TOKEN_RE.lastIndex = 0;
    if (!MERGE_TOKEN_RE.test(text)) continue;
    MERGE_TOKEN_RE.lastIndex = 0;

    const parent = textNode.parentNode;
    if (!parent) continue;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MERGE_TOKEN_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const token = match[0];
      frag.appendChild(
        createMergeTagElement({ label: labelForToken(token, variables), value: token })
      );
      lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    parent.replaceChild(frag, textNode);
  }
}

/**
 * Wrap known (or any) `{{…}}` tokens in chip spans for display.
 * Does not touch attribute values (href, etc.) — only text nodes.
 */
export function hydrateMergeTags(html: string, variables: Variable[] = []): string {
  if (!html || !html.includes("{{")) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  hydrateTextNodes(doc.body, variables);
  return doc.body.innerHTML;
}

/**
 * Replace chip spans with plain `data-merge-tag` text for host-friendly output
 * (policy B: onChange / getHTML emit raw merge tokens).
 */
export function serializeMergeTags(html: string): string {
  if (!html || !html.includes(CHIP_CLASS)) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const chips = Array.from(doc.body.querySelectorAll(`.${CHIP_CLASS}`));

  for (const chip of chips) {
    // Only serialize real chips (data-merge-tag present). Class-only spans
    // are left alone so labels never replace missing tokens.
    if (!isMergeTagNode(chip)) continue;
    const token =
      (chip as HTMLElement).dataset.mergeTag ??
      chip.getAttribute("data-merge-tag") ??
      "";
    if (!token) continue;
    const text = document.createTextNode(token);
    chip.parentNode?.replaceChild(text, chip);
  }

  return doc.body.innerHTML;
}
