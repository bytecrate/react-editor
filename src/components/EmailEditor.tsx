import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, useId } from "react";

import { EmailEditorProps, EmailEditorRef } from "../types";
import { DEFAULT_VARIABLES } from "../constants";
import { EDITOR_STYLES } from "../styles";
import { useImageResizer } from "../hooks/useImageResizer";
import { useEditorCommands } from "../hooks/useEditorCommands";
import { sanitizeEmailHtml, sanitizeUrl } from "../lib/sanitizeHtml";
import { hydrateMergeTags, serializeMergeTags } from "../lib/mergeTags";
import {
  isEditorDomEmpty,
  placeholderInsetFromPadding,
  getSelectedBlock,
  unwrapLink,
} from "../lib/editorDom";
import { EditorToolbar, DEFAULT_TOOLBAR } from "./toolbar/EditorToolbar";

export const EmailEditor = React.forwardRef<EmailEditorRef, EmailEditorProps>(function EmailEditor(
  {
    initialValue = "",
    value,
    onChange,
    style,
    className = "",
    placeholder = "Start writing your email...",
    ariaLabel,
    enableShortcuts = true,
    variables = DEFAULT_VARIABLES,
    variablesAsChips = true,
    defaultPadding = "24px",
    onImageUpload,
    onImageUploadError,
    defaultImageAlt = "",
    toolbarConfig = DEFAULT_TOOLBAR,
    sanitize = true,
    onPasteHtml,
  },
  ref
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const variablesRef = useRef<HTMLDivElement>(null);
  const paddingPickerRef = useRef<HTMLDivElement>(null);
  const imagePickerRef = useRef<HTMLDivElement>(null);
  const linkPickerRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  // Seed emptiness: controlled value wins over initialValue when both provided
  const seedHtml = isControlled ? (value ?? "") : (initialValue ?? "");
  
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [currentFont, setCurrentFont] = useState<string>('Arial');
  const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
  // Drive placeholder from React state — refs do not trigger re-renders
  const [isEmpty, setIsEmpty] = useState(() => {
    // Approximate empty check from seed string (DOM not available yet)
    const text = seedHtml.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
    return text.length === 0 && !/<img\b/i.test(seedHtml);
  });
  const placeholderInset = placeholderInsetFromPadding(defaultPadding);
  
  // Padding state for individual sides
  const [paddings, setPaddings] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [showPaddingPicker, setShowPaddingPicker] = useState(false);

  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  // Local form state for selected-image properties (alt + link wrap)
  const [imageAltDraft, setImageAltDraft] = useState("");
  const [imageLinkDraft, setImageLinkDraft] = useState("");
  const imageAltInputId = useId();
  const imageLinkInputId = useId();

  const updateActiveFormats = useCallback(() => {
    const formats: string[] = [];
    const commands = [
      'bold', 'italic', 'underline', 'strikeThrough',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'insertUnorderedList', 'insertOrderedList'
    ];
    
    commands.forEach(cmd => {
      if (document.queryCommandState(cmd)) formats.push(cmd);
    });

    // Highlight link control when caret is inside an <a>
    if (document.queryCommandState('createLink')) {
      formats.push('createLink');
    } else {
      // Fallback: walk ancestors (queryCommandState is unreliable for links in some engines)
      const selection = window.getSelection();
      let node: Node | null = selection?.anchorNode ?? null;
      if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
      while (node && node !== contentRef.current) {
        if (node instanceof HTMLAnchorElement) {
          formats.push('createLink');
          break;
        }
        node = node.parentNode;
      }
    }
    
    setActiveFormats(formats);

    // Update active font
    const fontValue = document.queryCommandValue('fontName');
    if (fontValue) {
      setCurrentFont(fontValue.replace(/['"]/g, ''));
    }

    // Update active font size
    const selection = window.getSelection();
    let computedFontSize = '16px';
    
    if (selection && selection.anchorNode) {
      const parent = selection.anchorNode.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : selection.anchorNode as Element;
      if (parent) {
        computedFontSize = window.getComputedStyle(parent).fontSize;
        setCurrentFontSize(computedFontSize);
      }
    }

    // Update active color
    const colorValue = document.queryCommandValue('foreColor');
    if (colorValue) {
      setActiveColor(colorValue);
    }

    // Update active padding from computed styles of the selected block
    const block = getSelectedBlock(contentRef.current);
    if (block) {
        const style = window.getComputedStyle(block);
        setPaddings({
          top: parseInt(style.paddingTop, 10) || 0,
          right: parseInt(style.paddingRight, 10) || 0,
          bottom: parseInt(style.paddingBottom, 10) || 0,
          left: parseInt(style.paddingLeft, 10) || 0
        });
    }
  }, []);

  // Keep latest variables for hydrate without re-running controlled sync on list identity changes
  const variablesListRef = useRef(variables);
  variablesListRef.current = variables;

  const handleInput = useCallback(() => {
    if (contentRef.current) {
      if (onChange) {
        // Policy B: emit plain merge tokens for host string-replace
        onChange(serializeMergeTags(contentRef.current.innerHTML));
      }
      setIsEmpty(isEditorDomEmpty(contentRef.current));
    }
    updateActiveFormats();
  }, [onChange, updateActiveFormats]);

  // Hook up useImageResizer
  const { selectedImg, setSelectedImg, handleResizeMouseDown } = useImageResizer(
    contentRef,
    resizerRef,
    () => {
      handleInput(); // Save state on resize end
    }
  );

  // Sync image property drafts when selection changes
  useEffect(() => {
    if (selectedImg) {
      setImageAltDraft(selectedImg.getAttribute("alt") ?? "");
      const parent = selectedImg.parentElement;
      setImageLinkDraft(
        parent instanceof HTMLAnchorElement ? parent.getAttribute("href") ?? "" : ""
      );
    } else {
      setImageAltDraft("");
      setImageLinkDraft("");
    }
  }, [selectedImg]);

  const applySelectedImageAlt = useCallback(
    (alt: string) => {
      if (!selectedImg) return;
      selectedImg.setAttribute("alt", alt);
      setImageAltDraft(alt);
      handleInput();
    },
    [selectedImg, handleInput]
  );

  const applySelectedImageLink = useCallback(
    (hrefRaw: string) => {
      if (!selectedImg) return;
      const raw = hrefRaw.trim();
      const parent = selectedImg.parentElement;

      if (!raw) {
        // Empty href: unwrap if currently inside a link
        if (parent instanceof HTMLAnchorElement) {
          unwrapLink(parent);
          handleInput();
        }
        setImageLinkDraft("");
        return;
      }

      const href = sanitize === false ? raw : sanitizeUrl(raw);
      if (href === null) {
        // Reject dangerous schemes; restore draft to current valid href if any
        const existing =
          parent instanceof HTMLAnchorElement
            ? parent.getAttribute("href") ?? ""
            : "";
        setImageLinkDraft(existing);
        return;
      }

      if (parent instanceof HTMLAnchorElement) {
        parent.setAttribute("href", href);
        parent.setAttribute("target", "_blank");
        parent.setAttribute("rel", "noopener noreferrer");
      } else {
        const anchor = document.createElement("a");
        anchor.setAttribute("href", href);
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
        selectedImg.parentNode?.insertBefore(anchor, selectedImg);
        anchor.appendChild(selectedImg);
      }
      setImageLinkDraft(href);
      handleInput();
    },
    [selectedImg, sanitize, handleInput]
  );

  /**
   * Sanitize external HTML (when enabled), then hydrate merge tokens to chips
   * for display. Changing `variables` mid-edit does not re-label existing chips
   * (variables are read via ref to avoid caret jumps on list identity churn).
   */
  const prepareHtml = useCallback(
    (html: string) => {
      const cleaned = sanitize === false ? html : sanitizeEmailHtml(html);
      if (variablesAsChips === false) return cleaned;
      return hydrateMergeTags(cleaned, variablesListRef.current);
    },
    [sanitize, variablesAsChips]
  );

  const applyHtmlToDom = useCallback((html: string) => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = prepareHtml(html);
    setIsEmpty(isEditorDomEmpty(contentRef.current));
    // Wholesale HTML replace detaches prior nodes — drop resizer + saved ranges
    setSelectedImg(null);
    savedSelectionRef.current = null;
  }, [setSelectedImg, prepareHtml]);

  // Mount seed: controlled uses value; uncontrolled uses initialValue once
  // Intentionally empty deps — uncontrolled seed is mount-only; controlled updates use the value effect below
  useEffect(() => {
    if (!contentRef.current) return;
    const seed = isControlled ? (value ?? "") : (initialValue ?? "");
    contentRef.current.innerHTML = prepareHtml(seed);
    contentRef.current.style.padding = defaultPadding;
    setIsEmpty(isEditorDomEmpty(contentRef.current));
  }, []);

  // Controlled sync: compare serialized forms so chip DOM vs plain-token value
  // does not thrash (hosts hold tokens; editor displays chips).
  useEffect(() => {
    if (!isControlled || !contentRef.current) return;
    const nextSerialized = serializeMergeTags(prepareHtml(value ?? ""));
    const currentSerialized = serializeMergeTags(contentRef.current.innerHTML);
    if (nextSerialized !== currentSerialized) {
      applyHtmlToDom(value ?? "");
    }
  }, [value, isControlled, applyHtmlToDom, prepareHtml]);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (variablesRef.current && !variablesRef.current.contains(event.target as Node)) {
        setShowVariables(false);
      }
      if (paddingPickerRef.current && !paddingPickerRef.current.contains(event.target as Node)) {
        setShowPaddingPicker(false);
      }
      if (imagePickerRef.current && !imagePickerRef.current.contains(event.target as Node)) {
        setShowImagePicker(false);
      }
      if (linkPickerRef.current && !linkPickerRef.current.contains(event.target as Node)) {
        setShowLinkPicker(false);
        setIsEditingLink(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape closes any open picker and returns focus to its trigger button
  useEffect(() => {
    const focusTrigger = (container: HTMLDivElement | null) => {
      const trigger = container?.querySelector<HTMLButtonElement>("button.ree-btn");
      trigger?.focus();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (showColorPicker) {
        event.preventDefault();
        setShowColorPicker(false);
        focusTrigger(colorPickerRef.current);
        return;
      }
      if (showVariables) {
        event.preventDefault();
        setShowVariables(false);
        focusTrigger(variablesRef.current);
        return;
      }
      if (showPaddingPicker) {
        event.preventDefault();
        setShowPaddingPicker(false);
        focusTrigger(paddingPickerRef.current);
        return;
      }
      if (showImagePicker) {
        event.preventDefault();
        setShowImagePicker(false);
        focusTrigger(imagePickerRef.current);
        return;
      }
      if (showLinkPicker) {
        event.preventDefault();
        setShowLinkPicker(false);
        setIsEditingLink(false);
        focusTrigger(linkPickerRef.current);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showColorPicker, showVariables, showPaddingPicker, showImagePicker, showLinkPicker]);

  useImperativeHandle(
    ref,
    () => {
      const setHTML = (html: string) => {
        applyHtmlToDom(html);
        // Policy B: emit serialized tokens so controlled parents match handleInput
        onChange?.(
          serializeMergeTags(contentRef.current?.innerHTML ?? html)
        );
      };
      return {
        focus: () => {
          contentRef.current?.focus();
        },
        getHTML: () =>
          serializeMergeTags(contentRef.current?.innerHTML ?? ""),
        setHTML,
        clear: () => setHTML(""),
        getContentElement: () => contentRef.current,
      };
    },
    [applyHtmlToDom, onChange]
  );

  const {
    execCommand,
    execFontSize,
    updatePadding,
    insertVariable,
    openVariablesPicker,
    openLinkPicker,
    applyLink,
    removeLink,
    applyLinkVariable,
    handleImageUploadClick,
    handleInsertImageUrl,
    handleImageSelection,
    handlePaste,
  } = useEditorCommands({
    contentRef,
    savedSelectionRef,
    fileInputRef,
    handleInput,
    updateActiveFormats,
    sanitize,
    variablesAsChips,
    variables,
    onPasteHtml,
    onImageUpload,
    onImageUploadError,
    defaultImageAlt,
    linkUrl,
    setLinkUrl,
    showLinkPicker,
    setShowLinkPicker,
    setIsEditingLink,
    setShowImagePicker,
    showVariables,
    setShowVariables,
    setShowColorPicker,
    setShowPaddingPicker,
    setPaddings,
  });

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enableShortcuts) return;

      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === "b") {
        e.preventDefault();
        execCommand("bold");
        return;
      }
      if (key === "i") {
        e.preventDefault();
        execCommand("italic");
        return;
      }
      if (key === "u") {
        e.preventDefault();
        execCommand("underline");
        return;
      }
      if (key === "k") {
        e.preventDefault();
        openLinkPicker();
        return;
      }
      if (key === "y") {
        e.preventDefault();
        execCommand("redo");
        return;
      }
      if (key === "z") {
        e.preventDefault();
        execCommand(e.shiftKey ? "redo" : "undo");
      }
    },
    [enableShortcuts, execCommand, openLinkPicker]
  );

  const contentAriaLabel = ariaLabel ?? placeholder ?? "Email content";

  return (
    <div className={`ree-container ${className}`} style={style}>
      <style>{EDITOR_STYLES}</style>
      
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelection}
        accept="image/*"
        style={{ display: 'none' }}
      />
      
      <EditorToolbar
        config={toolbarConfig}
        execCommand={execCommand}
        execFontSize={execFontSize}
        activeFormats={activeFormats}
        currentFont={currentFont}
        currentFontSize={currentFontSize}
        paddings={paddings}
        updatePadding={updatePadding}
        showPaddingPicker={showPaddingPicker}
        setShowPaddingPicker={setShowPaddingPicker}
        paddingPickerRef={paddingPickerRef}
        activeColor={activeColor}
        showColorPicker={showColorPicker}
        setShowColorPicker={setShowColorPicker}
        colorPickerRef={colorPickerRef}
        variables={variables}
        showVariables={showVariables}
        openVariablesPicker={openVariablesPicker}
        insertVariable={insertVariable}
        variablesRef={variablesRef}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        isEditingLink={isEditingLink}
        setIsEditingLink={setIsEditingLink}
        showLinkPicker={showLinkPicker}
        setShowLinkPicker={setShowLinkPicker}
        applyLink={applyLink}
        removeLink={removeLink}
        applyLinkVariable={applyLinkVariable}
        openLinkPicker={openLinkPicker}
        linkPickerRef={linkPickerRef}
        showImagePicker={showImagePicker}
        setShowImagePicker={setShowImagePicker}
        handleImageUploadClick={handleImageUploadClick}
        handleInsertImageUrl={handleInsertImageUrl}
        defaultImageAlt={defaultImageAlt}
        imagePickerRef={imagePickerRef}
      />

      {/* Editor Surface */}
      <div 
        className="ree-editor-area"
        onClick={(e) => {
            if (e.target !== contentRef.current && (e.target as HTMLElement).tagName === 'IMG') {
               setSelectedImg(e.target as HTMLImageElement);
            }
            if (e.target === contentRef.current) {
                contentRef.current.focus();
            }
        }}
      >
        <div 
          ref={contentRef}
          className="ree-content"
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={contentAriaLabel}
          onInput={handleInput}
          onKeyDown={handleEditorKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onPaste={handlePaste}
          style={{
            minHeight: '300px',
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
          suppressContentEditableWarning
        />
        {isEmpty && (
           <div className="ree-placeholder" style={{ top: placeholderInset, left: placeholderInset }}>{placeholder}</div>
        )}

        {/* Resizer Overlay + selected-image properties */}
        <div 
           ref={resizerRef}
           className={`ree-resizer ${selectedImg ? 'active' : ''}`}
        >
           {selectedImg && (
             <div
               className="ree-image-props"
               role="group"
               aria-label="Image properties"
               onMouseDown={(e) => e.stopPropagation()}
             >
               <div className="ree-image-props-field">
                 <label htmlFor={imageAltInputId}>Alt text</label>
                 <input
                   id={imageAltInputId}
                   type="text"
                   value={imageAltDraft}
                   onChange={(e) => {
                     const next = e.target.value;
                     setImageAltDraft(next);
                     // Live-update the attribute for a11y preview; emit onChange
                     // on blur/Enter/Apply to avoid controlled-mode thrash mid-edit
                     if (selectedImg) {
                       selectedImg.setAttribute("alt", next);
                     }
                   }}
                   onBlur={() => applySelectedImageAlt(imageAltDraft)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter") {
                       e.preventDefault();
                       applySelectedImageAlt(imageAltDraft);
                     }
                   }}
                   placeholder="Alt text"
                   aria-label="Selected image alt text"
                 />
               </div>
               <div className="ree-image-props-field">
                 <label htmlFor={imageLinkInputId}>Link URL</label>
                 <input
                   id={imageLinkInputId}
                   type="text"
                   value={imageLinkDraft}
                   onChange={(e) => setImageLinkDraft(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter") {
                       e.preventDefault();
                       applySelectedImageLink(imageLinkDraft);
                     }
                   }}
                   placeholder="https://… (empty to unwrap)"
                   aria-label="Selected image link URL"
                 />
               </div>
               <button
                 type="button"
                 className="ree-image-props-apply"
                 onMouseDown={(e) => {
                   e.preventDefault();
                   applySelectedImageAlt(imageAltDraft);
                   applySelectedImageLink(imageLinkDraft);
                 }}
               >
                 Apply
               </button>
             </div>
           )}
           <div className="ree-resize-handle ree-handle-nw" onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
           <div className="ree-resize-handle ree-handle-ne" onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
           <div className="ree-resize-handle ree-handle-sw" onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
           <div className="ree-resize-handle ree-handle-se" onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
        </div>
      </div>
    </div>
  );
});

EmailEditor.displayName = "EmailEditor";
