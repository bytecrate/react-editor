import React, { useState, useRef, useEffect, useCallback, useImperativeHandle } from "react";

import { EmailEditorProps, EmailEditorRef } from "../types";
import { DEFAULT_VARIABLES } from "../constants";
import { EDITOR_STYLES } from "../styles";
import { useImageResizer } from "../hooks/useImageResizer";
import { useEditorCommands } from "../hooks/useEditorCommands";
import { sanitizeEmailHtml } from "../lib/sanitizeHtml";
import {
  isEditorDomEmpty,
  placeholderInsetFromPadding,
  getSelectedBlock,
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
    variables = DEFAULT_VARIABLES,
    defaultPadding = "24px",
    onImageUpload,
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

  const handleInput = useCallback(() => {
    if (contentRef.current) {
      if (onChange) {
        onChange(contentRef.current.innerHTML);
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

  /** Sanitize external HTML when the sanitize prop is enabled (default). */
  const prepareHtml = useCallback(
    (html: string) => (sanitize === false ? html : sanitizeEmailHtml(html)),
    [sanitize]
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

  // Controlled sync: write when sanitized value differs from DOM (avoids caret jump)
  useEffect(() => {
    if (!isControlled || !contentRef.current) return;
    const next = prepareHtml(value ?? "");
    if (next !== contentRef.current.innerHTML) {
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

  useImperativeHandle(
    ref,
    () => {
      const setHTML = (html: string) => {
        applyHtmlToDom(html);
        // Emit post-serialize DOM HTML so controlled parents match handleInput
        onChange?.(contentRef.current?.innerHTML ?? html);
      };
      return {
        focus: () => {
          contentRef.current?.focus();
        },
        getHTML: () => contentRef.current?.innerHTML ?? "",
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
    openLinkPicker,
    applyLink,
    removeLink,
    applyLinkVariable,
    handleImageUploadClick,
    handleImageUrlClick,
    handleImageSelection,
    handlePaste,
  } = useEditorCommands({
    contentRef,
    savedSelectionRef,
    fileInputRef,
    handleInput,
    updateActiveFormats,
    sanitize,
    onPasteHtml,
    onImageUpload,
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
  });

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
        setShowVariables={setShowVariables}
        insertVariable={insertVariable}
        variablesRef={variablesRef}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        isEditingLink={isEditingLink}
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
        handleImageUrlClick={handleImageUrlClick}
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
          onInput={handleInput}
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

        {/* Resizer Overlay */}
        <div 
           ref={resizerRef}
           className={`ree-resizer ${selectedImg ? 'active' : ''}`}
        >
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
