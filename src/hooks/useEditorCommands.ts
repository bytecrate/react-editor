import React, { useCallback } from "react";
import {
  getSelectedBlock,
  getSelectedLink,
  unwrapLink,
  saveSelection,
  restoreSelection,
} from "../lib/editorDom";
import { sanitizeEmailHtml, sanitizeUrl } from "../lib/sanitizeHtml";
import type { PaddingSide, Paddings } from "../types";

export interface UseEditorCommandsOptions {
  contentRef: React.RefObject<HTMLDivElement | null>;
  savedSelectionRef: React.MutableRefObject<Range | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleInput: () => void;
  updateActiveFormats: () => void;
  sanitize: boolean;
  onPasteHtml?: (html: string) => string;
  onImageUpload?: (file: File) => Promise<string>;
  onImageUploadError?: (error: unknown) => void;
  defaultImageAlt?: string;
  // Link state
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  showLinkPicker: boolean;
  setShowLinkPicker: (show: boolean) => void;
  setIsEditingLink: (editing: boolean) => void;
  // Picker close helpers
  setShowImagePicker: (show: boolean) => void;
  setShowVariables: (show: boolean) => void;
  setShowColorPicker: (show: boolean) => void;
  setShowPaddingPicker: (show: boolean) => void;
  setPaddings: React.Dispatch<React.SetStateAction<Paddings>>;
}

export function useEditorCommands(options: UseEditorCommandsOptions) {
  const {
    contentRef,
    savedSelectionRef,
    fileInputRef,
    handleInput,
    updateActiveFormats,
    sanitize,
    onPasteHtml,
    onImageUpload,
    onImageUploadError,
    defaultImageAlt = "",
    linkUrl,
    setLinkUrl,
    showLinkPicker,
    setShowLinkPicker,
    setIsEditingLink,
    setShowImagePicker,
    setShowVariables,
    setShowColorPicker,
    setShowPaddingPicker,
    setPaddings,
  } = options;

  const execCommand = useCallback(
    (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (contentRef.current) {
        contentRef.current.focus();
      }
      handleInput();
      updateActiveFormats();
    },
    [contentRef, handleInput, updateActiveFormats]
  );

  const execFontSize = useCallback(
    (size: string) => {
      if (!contentRef.current) return;

      // Track any pre-existing font tags with size="7" to avoid modifying them
      const preExisting = new Set(contentRef.current.querySelectorAll('font[size="7"]'));

      document.execCommand("fontSize", false, "7");

      // Query current font tags and filter for only the newly inserted ones
      const currentFonts = contentRef.current.querySelectorAll('font[size="7"]');
      currentFonts.forEach((el) => {
        if (!preExisting.has(el)) {
          el.removeAttribute("size");
          (el as HTMLElement).style.fontSize = size;
        }
      });

      contentRef.current.focus();
      handleInput();
      updateActiveFormats();
    },
    [contentRef, handleInput, updateActiveFormats]
  );

  const updatePadding = useCallback(
    (side: PaddingSide, value: number) => {
      const block = getSelectedBlock(contentRef.current);
      if (block) {
        const sideName = side as string;
        const prop = `padding${sideName.charAt(0).toUpperCase() + sideName.slice(1)}`;
        // @ts-ignore
        block.style[prop] = `${value}px`;
        setPaddings((prev) => ({ ...prev, [side]: value }));
        handleInput();
      }
    },
    [contentRef, handleInput, setPaddings]
  );

  const insertVariable = useCallback(
    (value: string) => {
      document.execCommand("insertText", false, value);
      if (contentRef.current) {
        contentRef.current.focus();
      }
      handleInput();
      setShowVariables(false);
    },
    [contentRef, handleInput, setShowVariables]
  );

  const openLinkPicker = useCallback(() => {
    if (showLinkPicker) {
      setShowLinkPicker(false);
      setIsEditingLink(false);
      return;
    }

    // Capture selection before React re-render / focus moves into the popup
    saveSelection(savedSelectionRef);
    const existing = getSelectedLink(contentRef.current, savedSelectionRef.current);
    setLinkUrl(existing?.getAttribute("href") ?? "");
    setIsEditingLink(Boolean(existing));
    setShowLinkPicker(true);
    setShowImagePicker(false);
    setShowVariables(false);
    setShowColorPicker(false);
    setShowPaddingPicker(false);
  }, [
    showLinkPicker,
    savedSelectionRef,
    contentRef,
    setLinkUrl,
    setIsEditingLink,
    setShowLinkPicker,
    setShowImagePicker,
    setShowVariables,
    setShowColorPicker,
    setShowPaddingPicker,
  ]);

  const applyLink = useCallback(
    (urlOverride?: string) => {
      const raw = (urlOverride ?? linkUrl).trim();
      restoreSelection(savedSelectionRef, contentRef.current);
      const existing = getSelectedLink(contentRef.current, savedSelectionRef.current);

      if (!raw) {
        if (existing) {
          unwrapLink(existing);
          if (contentRef.current) {
            contentRef.current.focus();
          }
          handleInput();
          updateActiveFormats();
        }
        setShowLinkPicker(false);
        setLinkUrl("");
        setIsEditingLink(false);
        return;
      }

      // Block dangerous schemes when sanitization is on (default)
      const url = sanitize === false ? raw : sanitizeUrl(raw);
      if (url === null) {
        // Reject javascript:/etc. without modifying the selection
        return;
      }

      if (existing) {
        // Edit path: update the existing anchor so merge tags and non-URL hrefs are preserved
        existing.setAttribute("href", url);
        if (contentRef.current) {
          contentRef.current.focus();
        }
        handleInput();
        updateActiveFormats();
      } else {
        execCommand("createLink", url);
      }

      setShowLinkPicker(false);
      setLinkUrl("");
      setIsEditingLink(false);
    },
    [
      linkUrl,
      savedSelectionRef,
      contentRef,
      handleInput,
      updateActiveFormats,
      sanitize,
      execCommand,
      setShowLinkPicker,
      setLinkUrl,
      setIsEditingLink,
    ]
  );

  const removeLink = useCallback(() => {
    restoreSelection(savedSelectionRef, contentRef.current);
    const existing = getSelectedLink(contentRef.current, savedSelectionRef.current);
    if (existing) {
      unwrapLink(existing);
      if (contentRef.current) {
        contentRef.current.focus();
      }
      handleInput();
      updateActiveFormats();
    }
    setShowLinkPicker(false);
    setLinkUrl("");
    setIsEditingLink(false);
  }, [
    savedSelectionRef,
    contentRef,
    handleInput,
    updateActiveFormats,
    setShowLinkPicker,
    setLinkUrl,
    setIsEditingLink,
  ]);

  const applyLinkVariable = useCallback(
    (value: string) => {
      setLinkUrl(value);
      applyLink(value);
    },
    [setLinkUrl, applyLink]
  );

  const handleImageUploadClick = useCallback(() => {
    setShowImagePicker(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [fileInputRef, setShowImagePicker]);

  /** Escape a string for use inside a double-quoted HTML attribute. */
  const escapeAttr = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  /**
   * Insert an image with alt text. Uses insertHTML for control over `alt`.
   * Falls back to insertImage + setAttribute when insertHTML is unavailable.
   * Returns true when an image was inserted.
   */
  const insertImageWithAlt = useCallback(
    (url: string, alt: string = defaultImageAlt): boolean => {
      const safe = sanitize === false ? url.trim() : sanitizeUrl(url);
      if (!safe) return false;

      // Escape both attributes — isSafeUrl allows quotes inside https: URLs
      const safeSrc = escapeAttr(safe);
      const safeAlt = escapeAttr(alt);
      const html = `<img src="${safeSrc}" alt="${safeAlt}" />`;
      const inserted = document.execCommand("insertHTML", false, html);

      if (!inserted && contentRef.current) {
        // Fallback: insertImage then set alt on the last matching img
        document.execCommand("insertImage", false, safe);
        const imgs = contentRef.current.querySelectorAll("img");
        const last = imgs[imgs.length - 1];
        if (last && (last.getAttribute("src") === safe || last.src === safe)) {
          last.setAttribute("alt", alt);
        }
      }

      if (contentRef.current) {
        contentRef.current.focus();
      }
      handleInput();
      updateActiveFormats();
      return true;
    },
    [sanitize, defaultImageAlt, contentRef, handleInput, updateActiveFormats]
  );

  const handleInsertImageUrl = useCallback(
    (url: string, alt: string) => {
      if (!url.trim()) return;
      // Keep the picker open when the URL is rejected so the user can fix it
      if (insertImageWithAlt(url, alt)) {
        setShowImagePicker(false);
      }
    },
    [setShowImagePicker, insertImageWithAlt]
  );

  /** Derive a reasonable default alt from a file name when none is configured. */
  const altForFile = useCallback(
    (file: File) => {
      if (defaultImageAlt) return defaultImageAlt;
      const base = file.name.replace(/\.[^.]+$/, "").trim();
      return base || "";
    },
    [defaultImageAlt]
  );

  const handleImageSelection = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const alt = altForFile(file);
        if (onImageUpload) {
          try {
            const url = await onImageUpload(file);
            if (url) {
              insertImageWithAlt(url, alt);
            }
          } catch (err) {
            console.error("Error uploading image:", err);
            onImageUploadError?.(err);
          }
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
              insertImageWithAlt(base64, alt);
            }
          };
          reader.readAsDataURL(file);
        }
      }
      // Reset the input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onImageUpload, onImageUploadError, insertImageWithAlt, altForFile, fileInputRef]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (sanitize === false) {
        // Explicit escape hatch: allow native browser paste
        return;
      }

      const html = e.clipboardData?.getData("text/html");
      const text = e.clipboardData?.getData("text/plain");

      // Only take over when we have text/html or plain text. Leave image-only
      // clipboard pastes (screenshots, etc.) to the browser default.
      if (!html && !text) {
        return;
      }

      e.preventDefault();

      if (html) {
        // onPasteHtml fully replaces the built-in sanitizer for this path —
        // hosts must return safe HTML (equal trust boundary to sanitize={false} for paste).
        const clean = onPasteHtml ? onPasteHtml(html) : sanitizeEmailHtml(html);
        document.execCommand("insertHTML", false, clean);
      } else if (text) {
        document.execCommand("insertText", false, text);
      }
      handleInput();
    },
    [sanitize, onPasteHtml, handleInput]
  );

  return {
    execCommand,
    execFontSize,
    updatePadding,
    insertVariable,
    openLinkPicker,
    applyLink,
    removeLink,
    applyLinkVariable,
    handleImageUploadClick,
    handleInsertImageUrl,
    handleImageSelection,
    insertImageWithAlt,
    handlePaste,
  };
}
