import React, { useState, useRef, useEffect, useCallback, useImperativeHandle } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2, Quote, Undo, Redo, Eraser,
  Type, Palette, Braces, Move, Plus, Minus
} from "lucide-react";

import { EmailEditorProps, EmailEditorRef, ToolbarConfig, ToolbarItem } from "../types";
import { FONT_FAMILIES, FONT_SIZES, PRESET_COLORS, DEFAULT_VARIABLES } from "../constants";
import { EDITOR_STYLES } from "../styles";
import { ToolbarButton } from "./ToolbarButton";
import { useImageResizer } from "../hooks/useImageResizer";

const DEFAULT_TOOLBAR: ToolbarConfig = [
  ['undo', 'redo'],
  ['fontFamily'],
  ['fontSize'],
  ['padding'],
  ['color'],
  ['variables'],
  ['h1', 'h2', 'p'],
  ['bold', 'italic', 'underline', 'strikeThrough'],
  ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
  ['unorderedList', 'orderedList'],
  ['link', 'image', 'blockquote', 'removeFormat']
];

/** True when the contenteditable DOM has no meaningful text or contentful markup. */
function isEditorDomEmpty(el: HTMLElement): boolean {
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
function placeholderInsetFromPadding(defaultPadding: string): number {
  const trimmed = defaultPadding.trim();
  // Only single-token px values are supported for placeholder offset
  const match = /^([\d.]+)px$/i.exec(trimmed);
  if (!match) return 24;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : 24;
}

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

  // Hook up useImageResizer
  const { selectedImg, setSelectedImg, handleResizeMouseDown, updateResizer } = useImageResizer(
    contentRef,
    resizerRef,
    () => {
      handleInput(); // Save state on resize end
    }
  );

  const applyHtmlToDom = useCallback((html: string) => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = html;
    setIsEmpty(isEditorDomEmpty(contentRef.current));
    // Wholesale HTML replace detaches prior nodes — drop resizer + saved ranges
    setSelectedImg(null);
    savedSelectionRef.current = null;
  }, [setSelectedImg]);

  // Mount seed: controlled uses value; uncontrolled uses initialValue once
  // Intentionally empty deps — uncontrolled seed is mount-only; controlled updates use the value effect below
  useEffect(() => {
    if (!contentRef.current) return;
    const seed = isControlled ? (value ?? "") : (initialValue ?? "");
    contentRef.current.innerHTML = seed;
    contentRef.current.style.padding = defaultPadding;
    setIsEmpty(isEditorDomEmpty(contentRef.current));
  }, []);

  // Controlled sync: write when value differs from DOM (avoids caret jump on equal strings)
  useEffect(() => {
    if (!isControlled || !contentRef.current) return;
    const next = value ?? "";
    if (next !== contentRef.current.innerHTML) {
      applyHtmlToDom(next);
    }
  }, [value, isControlled, applyHtmlToDom]);

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

  const handleInput = () => {
    if (contentRef.current) {
      if (onChange) {
        onChange(contentRef.current.innerHTML);
      }
      setIsEmpty(isEditorDomEmpty(contentRef.current));
    }
    updateActiveFormats();
  };

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

  const getSelectedBlock = (): HTMLElement | null => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !contentRef.current) return null;
    
    let node: Node | null = selection.anchorNode;
    
    // If text node, start from parent
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    // Traverse up to find a suitable block or stop at root
    while (node && node !== contentRef.current) {
       if (node instanceof HTMLElement) {
          const display = window.getComputedStyle(node).display;
          if (display === 'block' || display === 'list-item' || display === 'flex' || display === 'grid') {
             return node;
          }
       }
       node = node.parentNode;
    }
    
    return contentRef.current;
  };

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
    const block = getSelectedBlock();
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

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      contentRef.current.focus();
    }
    handleInput();
    updateActiveFormats();
  };

  const execFontSize = (size: string) => {
    if (!contentRef.current) return;

    // Track any pre-existing font tags with size="7" to avoid modifying them
    const preExisting = new Set(contentRef.current.querySelectorAll('font[size="7"]'));

    document.execCommand('fontSize', false, '7');

    // Query current font tags and filter for only the newly inserted ones
    const currentFonts = contentRef.current.querySelectorAll('font[size="7"]');
    currentFonts.forEach(el => {
      if (!preExisting.has(el)) {
        el.removeAttribute('size');
        (el as HTMLElement).style.fontSize = size;
      }
    });

    contentRef.current.focus();
    handleInput();
    updateActiveFormats();
  };

  const updatePadding = (side: keyof typeof paddings, value: number) => {
    const block = getSelectedBlock();
    if (block) {
        const sideName = side as string;
        const prop = `padding${sideName.charAt(0).toUpperCase() + sideName.slice(1)}`;
        // @ts-ignore
        block.style[prop] = `${value}px`;
        setPaddings(prev => ({ ...prev, [side]: value }));
        handleInput();
    }
  };

  const insertVariable = (value: string) => {
    document.execCommand('insertText', false, value);
    if (contentRef.current) {
      contentRef.current.focus();
    }
    handleInput();
    setShowVariables(false);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      savedSelectionRef.current = null;
    }
  };

  const restoreSelection = () => {
    const range = savedSelectionRef.current;
    if (!range) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
    if (contentRef.current) {
      contentRef.current.focus();
    }
  };

  /** Walk from the caret/selection up to the editor root for an enclosing <a>. */
  const getSelectedLink = (): HTMLAnchorElement | null => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !contentRef.current) return null;

    let node: Node | null = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    while (node && node !== contentRef.current) {
      if (node instanceof HTMLAnchorElement) {
        return node;
      }
      node = node.parentNode;
    }

    // Also check the saved range (popup focus may have cleared live selection)
    const saved = savedSelectionRef.current;
    if (saved) {
      let savedNode: Node | null = saved.commonAncestorContainer;
      if (savedNode.nodeType === Node.TEXT_NODE) {
        savedNode = savedNode.parentNode;
      }
      while (savedNode && savedNode !== contentRef.current) {
        if (savedNode instanceof HTMLAnchorElement) {
          return savedNode;
        }
        savedNode = savedNode.parentNode;
      }
    }

    return null;
  };

  const openLinkPicker = () => {
    if (showLinkPicker) {
      setShowLinkPicker(false);
      setIsEditingLink(false);
      return;
    }

    // Capture selection before React re-render / focus moves into the popup
    saveSelection();
    const existing = getSelectedLink();
    setLinkUrl(existing?.getAttribute('href') ?? '');
    setIsEditingLink(Boolean(existing));
    setShowLinkPicker(true);
    setShowImagePicker(false);
    setShowVariables(false);
    setShowColorPicker(false);
    setShowPaddingPicker(false);
  };

  const applyLink = (urlOverride?: string) => {
    const url = (urlOverride ?? linkUrl).trim();
    restoreSelection();
    const existing = getSelectedLink();

    if (!url) {
      if (existing) {
        unwrapLink(existing);
        if (contentRef.current) {
          contentRef.current.focus();
        }
        handleInput();
        updateActiveFormats();
      }
      setShowLinkPicker(false);
      setLinkUrl('');
      setIsEditingLink(false);
      return;
    }

    if (existing) {
      // Edit path: update the existing anchor so merge tags and non-URL hrefs are preserved
      existing.setAttribute('href', url);
      if (contentRef.current) {
        contentRef.current.focus();
      }
      handleInput();
      updateActiveFormats();
    } else {
      execCommand('createLink', url);
    }

    setShowLinkPicker(false);
    setLinkUrl('');
    setIsEditingLink(false);
  };

  const unwrapLink = (anchor: HTMLAnchorElement) => {
    const parent = anchor.parentNode;
    if (!parent) return;
    while (anchor.firstChild) {
      parent.insertBefore(anchor.firstChild, anchor);
    }
    parent.removeChild(anchor);
    // Normalize adjacent text nodes so the editor content stays clean
    parent.normalize();
  };

  const removeLink = () => {
    restoreSelection();
    const existing = getSelectedLink();
    if (existing) {
      unwrapLink(existing);
      if (contentRef.current) {
        contentRef.current.focus();
      }
      handleInput();
      updateActiveFormats();
    }
    setShowLinkPicker(false);
    setLinkUrl('');
    setIsEditingLink(false);
  };

  const applyLinkVariable = (value: string) => {
    setLinkUrl(value);
    applyLink(value);
  };

  const handleImageUploadClick = () => {
    setShowImagePicker(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUrlClick = () => {
    setShowImagePicker(false);
    const url = prompt("Enter Image URL:");
    if (url) execCommand("insertImage", url);
  };

  const handleImageSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onImageUpload) {
        try {
          const url = await onImageUpload(file);
          if (url) {
            execCommand("insertImage", url);
          }
        } catch (err) {
          console.error("Error uploading image:", err);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            execCommand("insertImage", base64);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderToolbarItem = (item: ToolbarItem) => {
    switch (item) {
      case 'undo':
        return <ToolbarButton key="undo" icon={Undo} onMouseDown={() => execCommand("undo")} label="Undo" />;
      case 'redo':
        return <ToolbarButton key="redo" icon={Redo} onMouseDown={() => execCommand("redo")} label="Redo" />;
      case 'fontFamily':
        return (
          <div key="fontFamily" className="ree-select-wrapper">
             <select
              className="ree-select"
              value={currentFont}
              onChange={(e) => execCommand('fontName', e.target.value)}
              title="Font Family"
              style={{ width: '130px', fontFamily: currentFont }}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </select>
            <div className="ree-chevron">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        );
      case 'fontSize':
        return (
          <div key="fontSize" className="ree-select-wrapper">
             <select
              className="ree-select"
              value={currentFontSize}
              onChange={(e) => execFontSize(e.target.value)}
              title="Font Size"
              style={{ width: '80px' }}
            >
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
            <div className="ree-chevron">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        );
      case 'padding':
        return (
          <div key="padding" className="ree-dropdown-container" ref={paddingPickerRef}>
             <button
              type="button"
              onClick={() => setShowPaddingPicker(!showPaddingPicker)}
              className={`ree-btn ${showPaddingPicker ? 'active' : ''}`}
              title="Padding & Spacing"
            >
              <Move size={18} />
            </button>

            {showPaddingPicker && (
              <div className="ree-popup" style={{ width: '200px' }}>
                <div className="ree-label">Padding (px)</div>
                <div>
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                    <div key={side} className="ree-pad-row">
                      <span className="ree-pad-label">{side}</span>
                      <div className="ree-pad-ctrl">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                             e.preventDefault(); 
                             updatePadding(side, Math.max(0, paddings[side] - 1));
                          }}
                          className="ree-pad-btn"
                          title="Decrease"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="ree-pad-val">
                          {paddings[side]}
                        </span>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                             e.preventDefault(); 
                             updatePadding(side, paddings[side] + 1);
                          }}
                          className="ree-pad-btn"
                          title="Increase"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'color':
        return (
          <div key="color" className="ree-dropdown-container" ref={colorPickerRef}>
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`ree-btn ${showColorPicker ? 'active' : ''}`}
              title="Text Color"
            >
              <Palette 
                size={18} 
                style={{ 
                  color: activeColor && activeColor !== 'rgb(0, 0, 0)' && activeColor !== '#000000' 
                    ? activeColor 
                    : 'inherit' 
                }} 
              />
            </button>
            
            {showColorPicker && (
              <div className="ree-popup" style={{ width: '220px' }}>
                <div className="ree-label">Presets</div>
                <div className="ree-grid">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="ree-color-swatch"
                      style={{ backgroundColor: color }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCommand('foreColor', color);
                        setShowColorPicker(false);
                      }}
                      title={color}
                    />
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '8px' }}>
                   <div className="ree-label">Custom</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      className="ree-color-input"
                      onChange={(e) => {
                        execCommand('foreColor', e.target.value);
                        setShowColorPicker(false);
                      }}
                      title="Choose custom color"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'variables':
        return (
          <div key="variables" className="ree-dropdown-container" ref={variablesRef}>
            <button
              type="button"
              onClick={() => setShowVariables(!showVariables)}
              className={`ree-btn ${showVariables ? 'active' : ''}`}
              title="Insert Variable"
            >
              <Braces size={18} />
            </button>

            {showVariables && (
              <div className="ree-popup" style={{ width: '200px', padding: '0' }}>
                 <div className="ree-label" style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', margin: 0 }}>
                   Insert Variable
                 </div>
                 <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
                   {variables.length > 0 ? (
                     variables.map((variable) => (
                       <button
                         key={variable.value}
                         className="ree-list-btn"
                         onMouseDown={(e) => {
                           e.preventDefault();
                           insertVariable(variable.value);
                         }}
                       >
                         {variable.label}
                       </button>
                     ))
                   ) : (
                     <div style={{ padding: '8px 12px', fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
                       No variables available
                     </div>
                   )}
                 </div>
              </div>
            )}
          </div>
        );
      case 'h1':
        return <ToolbarButton key="h1" icon={Heading1} onMouseDown={() => execCommand("formatBlock", "H1")} label="Heading 1" />;
      case 'h2':
        return <ToolbarButton key="h2" icon={Heading2} onMouseDown={() => execCommand("formatBlock", "H2")} label="Heading 2" />;
      case 'p':
        return <ToolbarButton key="p" icon={Type} onMouseDown={() => execCommand("formatBlock", "P")} label="Paragraph" />;
      case 'bold':
        return <ToolbarButton key="bold" icon={Bold} onMouseDown={() => execCommand("bold")} isActive={activeFormats.includes('bold')} label="Bold" />;
      case 'italic':
        return <ToolbarButton key="italic" icon={Italic} onMouseDown={() => execCommand("italic")} isActive={activeFormats.includes('italic')} label="Italic" />;
      case 'underline':
        return <ToolbarButton key="underline" icon={Underline} onMouseDown={() => execCommand("underline")} isActive={activeFormats.includes('underline')} label="Underline" />;
      case 'strikeThrough':
        return <ToolbarButton key="strikeThrough" icon={Strikethrough} onMouseDown={() => execCommand("strikeThrough")} isActive={activeFormats.includes('strikeThrough')} label="Strikethrough" />;
      case 'justifyLeft':
        return <ToolbarButton key="justifyLeft" icon={AlignLeft} onMouseDown={() => execCommand("justifyLeft")} isActive={activeFormats.includes('justifyLeft')} label="Align Left" />;
      case 'justifyCenter':
        return <ToolbarButton key="justifyCenter" icon={AlignCenter} onMouseDown={() => execCommand("justifyCenter")} isActive={activeFormats.includes('justifyCenter')} label="Align Center" />;
      case 'justifyRight':
        return <ToolbarButton key="justifyRight" icon={AlignRight} onMouseDown={() => execCommand("justifyRight")} isActive={activeFormats.includes('justifyRight')} label="Align Right" />;
      case 'justifyFull':
        return <ToolbarButton key="justifyFull" icon={AlignJustify} onMouseDown={() => execCommand("justifyFull")} isActive={activeFormats.includes('justifyFull')} label="Justify" />;
      case 'unorderedList':
        return <ToolbarButton key="unorderedList" icon={List} onMouseDown={() => execCommand("insertUnorderedList")} isActive={activeFormats.includes('insertUnorderedList')} label="Bullet List" />;
      case 'orderedList':
        return <ToolbarButton key="orderedList" icon={ListOrdered} onMouseDown={() => execCommand("insertOrderedList")} isActive={activeFormats.includes('insertOrderedList')} label="Ordered List" />;
      case 'link':
        return (
          <div key="link" className="ree-dropdown-container" ref={linkPickerRef}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                openLinkPicker();
              }}
              className={`ree-btn ${showLinkPicker || activeFormats.includes('createLink') ? 'active' : ''}`}
              title={activeFormats.includes('createLink') || isEditingLink ? 'Edit Link' : 'Link'}
            >
              <LinkIcon size={18} />
            </button>

            {showLinkPicker && (
              <div className="ree-popup" style={{ width: '260px', padding: '0' }}>
                <div
                  className="ree-label"
                  style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', margin: 0 }}
                >
                  {isEditingLink ? 'Edit Link' : 'Insert Link'}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <label
                    className="ree-label"
                    style={{ display: 'block', marginBottom: 6, textTransform: 'none', letterSpacing: 0 }}
                  >
                    URL or variable
                  </label>
                  <input
                    type="text"
                    className="ree-link-input"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyLink();
                      }
                      if (e.key === 'Escape') {
                        setShowLinkPicker(false);
                      }
                    }}
                    placeholder="https://… or {{unsubscribe}}"
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="ree-list-btn"
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        fontWeight: 500,
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLink();
                      }}
                    >
                      {isEditingLink ? 'Update' : 'Apply'}
                    </button>
                    {isEditingLink && (
                      <button
                        type="button"
                        className="ree-list-btn"
                        style={{ flex: 1, textAlign: 'center' }}
                        title="Unlink"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          removeLink();
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {variables.length > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb' }}>
                    <div
                      className="ree-label"
                      style={{ padding: '8px 12px 4px', margin: 0 }}
                    >
                      Use variable as URL
                    </div>
                    <div style={{ maxHeight: 160, overflowY: 'auto', padding: '0 4px 4px' }}>
                      {variables.map((variable) => (
                        <button
                          key={variable.value}
                          type="button"
                          className="ree-list-btn"
                          title={variable.value}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyLinkVariable(variable.value);
                          }}
                        >
                          {variable.label}
                          <span
                            style={{
                              display: 'block',
                              fontSize: 11,
                              color: '#9ca3af',
                              marginTop: 2,
                            }}
                          >
                            {variable.value}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'image':
        return (
          <div key="image" className="ree-dropdown-container" ref={imagePickerRef}>
             <button
              type="button"
              onClick={() => setShowImagePicker(!showImagePicker)}
              className={`ree-btn ${showImagePicker ? 'active' : ''}`}
              title="Insert Image"
            >
              <ImageIcon size={18} />
            </button>
            
            {showImagePicker && (
              <div className="ree-popup" style={{ width: '200px', padding: '4px' }}>
                 <button
                   type="button"
                   className="ree-list-btn"
                   onClick={handleImageUploadClick}
                 >
                   Upload from Device
                 </button>
                 <button
                   type="button"
                   className="ree-list-btn"
                   onClick={handleImageUrlClick}
                 >
                   Insert via URL
                 </button>
              </div>
            )}
          </div>
        );
      case 'blockquote':
        return <ToolbarButton key="blockquote" icon={Quote} onMouseDown={() => execCommand("formatBlock", "BLOCKQUOTE")} label="Quote" />;
      case 'removeFormat':
        return <ToolbarButton key="removeFormat" icon={Eraser} onMouseDown={() => execCommand("removeFormat")} label="Clear Formatting" />;
      default:
        return null;
    }
  };

  const normalizedConfig = toolbarConfig.map((group) => {
    if (Array.isArray(group)) {
      return group;
    }
    return [group];
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
      
      {/* Toolbar */}
      <div className="ree-toolbar">
        {normalizedConfig.map((group, groupIdx) => {
          const renderedItems = group
            .map(item => renderToolbarItem(item))
            .filter(item => item !== null);

          if (renderedItems.length === 0) return null;

          return (
            <div key={groupIdx} className="ree-group">
              {renderedItems}
            </div>
          );
        })}
      </div>

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
