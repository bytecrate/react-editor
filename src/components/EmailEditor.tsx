import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2, Quote, Undo, Redo, Eraser,
  Type, Palette, Braces, Move, Plus, Minus
} from "lucide-react";

import { EmailEditorProps, ToolbarConfig, ToolbarItem } from "../types";
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

export const EmailEditor: React.FC<EmailEditorProps> = ({
  initialValue = "",
  onChange,
  style,
  className = "",
  placeholder = "Start writing your email...",
  variables = DEFAULT_VARIABLES,
  defaultPadding = "24px",
  onImageUpload,
  toolbarConfig = DEFAULT_TOOLBAR
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const variablesRef = useRef<HTMLDivElement>(null);
  const paddingPickerRef = useRef<HTMLDivElement>(null);
  const imagePickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [currentFont, setCurrentFont] = useState<string>('Arial');
  const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
  
  // Padding state for individual sides
  const [paddings, setPaddings] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [showPaddingPicker, setShowPaddingPicker] = useState(false);

  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Hook up useImageResizer
  const { selectedImg, setSelectedImg, handleResizeMouseDown, updateResizer } = useImageResizer(
    contentRef,
    resizerRef,
    () => {
      handleInput(); // Save state on resize end
    }
  );

  // Initialize content and default padding
  useEffect(() => {
    if (contentRef.current) {
      if (initialValue && !contentRef.current.innerHTML) {
        contentRef.current.innerHTML = initialValue;
      }
      // Apply default padding directly to DOM
      contentRef.current.style.padding = defaultPadding;
    }
  }, []);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = () => {
    if (contentRef.current && onChange) {
      const html = contentRef.current.innerHTML;
      onChange(html);
    }
    updateActiveFormats();
  };

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

  const addLink = () => {
    const url = prompt("Enter URL:");
    if (url) execCommand("createLink", url);
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
        return <ToolbarButton key="link" icon={LinkIcon} onMouseDown={() => addLink()} label="Link" />;
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
        {(!contentRef.current?.innerText && !contentRef.current?.innerHTML) && (
           <div className="ree-placeholder" style={{ top: paddings.top || 24, left: paddings.left || 24 }}>{placeholder}</div>
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
};
