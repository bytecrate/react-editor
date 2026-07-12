/** True when the contenteditable DOM has no meaningful text or contentful markup. */
export function isEditorDomEmpty(el: HTMLElement): boolean {
  const text = (el.innerText || el.textContent || "").replace(/\u200B/g, "").trim();
  if (text.length > 0) return false;

  // Images / media / structural content count as non-empty even without text
  if (el.querySelector("img, video, hr, table, iframe, object, embed, svg")) {
    return false;
  }

  // Treat browser-default empty shells as empty (attrs ok: <br type="_moz">, styled empty <p>)
  const html = (el.innerHTML || "")
    .replace(/<br\b[^>]*>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<\/?(?:p|div|span|font|b|i|u|strong|em|a)\b[^>]*>/gi, "")
    .trim();
  return html.length === 0;
}

/**
 * Resolve placeholder top/left from defaultPadding when it is a single px length
 * (e.g. "24px"). Multi-value shorthand and non-px units fall back to 24.
 */
export function placeholderInsetFromPadding(defaultPadding: string): number {
  const trimmed = defaultPadding.trim();
  // Only single-token px values are supported for placeholder offset
  const match = /^([\d.]+)px$/i.exec(trimmed);
  if (!match) return 24;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : 24;
}

/** Walk from the caret up to the editor root for a block-level element. */
export function getSelectedBlock(editorRoot: HTMLElement | null): HTMLElement | null {
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode || !editorRoot) return null;

  let node: Node | null = selection.anchorNode;

  // If text node, start from parent
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  // Traverse up to find a suitable block or stop at root
  while (node && node !== editorRoot) {
    if (node instanceof HTMLElement) {
      const display = window.getComputedStyle(node).display;
      if (display === "block" || display === "list-item" || display === "flex" || display === "grid") {
        return node;
      }
    }
    node = node.parentNode;
  }

  return editorRoot;
}

/**
 * Walk from the caret/selection up to the editor root for an enclosing <a>.
 * Also checks a saved range (popup focus may have cleared live selection).
 */
export function getSelectedLink(
  editorRoot: HTMLElement | null,
  savedRange: Range | null = null
): HTMLAnchorElement | null {
  const selection = window.getSelection();
  if (selection && selection.anchorNode && editorRoot) {
    let node: Node | null = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    while (node && node !== editorRoot) {
      if (node instanceof HTMLAnchorElement) {
        return node;
      }
      node = node.parentNode;
    }
  }

  // Also check the saved range (popup focus may have cleared live selection)
  if (savedRange && editorRoot) {
    let savedNode: Node | null = savedRange.commonAncestorContainer;
    if (savedNode.nodeType === Node.TEXT_NODE) {
      savedNode = savedNode.parentNode;
    }
    while (savedNode && savedNode !== editorRoot) {
      if (savedNode instanceof HTMLAnchorElement) {
        return savedNode;
      }
      savedNode = savedNode.parentNode;
    }
  }

  return null;
}

/** Unwrap an anchor, preserving its children and normalizing adjacent text nodes. */
export function unwrapLink(anchor: HTMLAnchorElement): void {
  const parent = anchor.parentNode;
  if (!parent) return;
  while (anchor.firstChild) {
    parent.insertBefore(anchor.firstChild, anchor);
  }
  parent.removeChild(anchor);
  // Normalize adjacent text nodes so the editor content stays clean
  parent.normalize();
}

/** Capture the current selection into a ref for later restore. */
export function saveSelection(savedSelectionRef: { current: Range | null }): void {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
  } else {
    savedSelectionRef.current = null;
  }
}

/** Restore a previously saved selection and focus the editor. */
export function restoreSelection(
  savedSelectionRef: { current: Range | null },
  editorRoot: HTMLElement | null
): void {
  const range = savedSelectionRef.current;
  if (!range) return;
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
  if (editorRoot) {
    editorRoot.focus();
  }
}
