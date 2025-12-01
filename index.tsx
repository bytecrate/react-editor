import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2, Quote, Undo, Redo, Eraser,
  Type, Palette, Braces, Move, Plus, Minus
} from "lucide-react";

export interface Variable {
  label: string;
  value: string;
}

export interface EmailEditorProps {
  initialValue?: string;
  onChange?: (html: string) => void;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  variables?: Variable[];
  defaultPadding?: string;
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Tahoma', value: 'Tahoma' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
];

const FONT_SIZES = [
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '24px', value: '24px' },
  { label: '36px', value: '36px' },
];

const PRESET_COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
];

const DEFAULT_VARIABLES = [
  { label: 'First Name', value: '{{firstName}}' },
  { label: 'Last Name', value: '{{lastName}}' },
  { label: 'Email', value: '{{email}}' },
  { label: 'Company', value: '{{company}}' },
  { label: 'Unsubscribe Link', value: '{{unsubscribe}}' },
];

// Internal CSS styles to remove Tailwind dependency
const EDITOR_STYLES = `
  .ree-container {
    display: flex;
    flex-direction: column;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background-color: #ffffff;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  
  .ree-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
    user-select: none;
  }

  .ree-group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-right: 8px;
    border-right: 1px solid #e5e7eb;
    margin-right: 4px;
  }

  .ree-group:last-child {
    border-right: none;
  }

  .ree-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 4px;
    color: #4b5563;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .ree-btn:hover {
    background-color: #f3f4f6;
    color: #111827;
  }

  .ree-btn.active {
    background-color: #eff6ff;
    color: #2563eb;
  }

  .ree-select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .ree-select {
    appearance: none;
    -webkit-appearance: none;
    background-color: transparent;
    color: #374151;
    font-size: 14px;
    font-weight: 500;
    padding: 4px 8px;
    padding-right: 24px;
    border-radius: 4px;
    border: 1px solid transparent;
    outline: none;
    cursor: pointer;
  }

  .ree-select:hover {
    background-color: #f3f4f6;
    border-color: #e5e7eb;
  }

  .ree-chevron {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #9ca3af;
  }

  .ree-dropdown-container {
    position: relative;
  }

  .ree-popup {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background-color: white;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border-radius: 6px;
    padding: 12px;
    z-index: 50;
    min-width: 200px;
    animation: ree-fade-in 0.1s ease-out;
  }

  @keyframes ree-fade-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .ree-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ree-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-bottom: 12px;
  }

  .ree-color-swatch {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
    cursor: pointer;
    transition: transform 0.1s;
  }

  .ree-color-swatch:hover {
    transform: scale(1.1);
    border-color: #9ca3af;
  }

  .ree-color-input {
    width: 100%;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }

  .ree-list-btn {
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    font-size: 14px;
    color: #374151;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 4px;
  }

  .ree-list-btn:hover {
    background-color: #eff6ff;
    color: #2563eb;
  }

  .ree-pad-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .ree-pad-label {
    color: #6b7280;
    font-size: 12px;
    text-transform: capitalize;
    width: 40px;
  }

  .ree-pad-ctrl {
    display: flex;
    align-items: center;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background-color: #f9fafb;
    overflow: hidden;
  }

  .ree-pad-btn {
    padding: 4px 6px;
    background: transparent;
    border: none;
    color: #4b5563;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  
  .ree-pad-btn:hover {
    background-color: #e5e7eb;
  }

  .ree-pad-val {
    font-size: 12px;
    font-weight: 500;
    width: 32px;
    text-align: center;
    color: #374151;
    user-select: none;
  }

  .ree-editor-area {
    flex: 1;
    position: relative;
    background-color: white;
  }

  .ree-content {
    width: 100%;
    height: 100%;
    outline: none;
    overflow-y: auto;
  }

  .ree-placeholder {
    position: absolute;
    color: #9ca3af;
    pointer-events: none;
  }

  /* Editor Content Styles */
  .ree-content ul { list-style-type: disc; padding-left: 1.5em; margin: 1em 0; }
  .ree-content ol { list-style-type: decimal; padding-left: 1.5em; margin: 1em 0; }
  .ree-content h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  .ree-content h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; }
  .ree-content p { margin: 1em 0; }
  .ree-content blockquote { border-left: 4px solid #e5e7eb; margin: 1em 0; padding-left: 1em; color: #4b5563; font-style: italic; }
  .ree-content a { color: #2563eb; text-decoration: underline; }
  .ree-content img { max-width: 100%; height: auto; border-radius: 4px; }
`;

export const EmailEditor: React.FC<EmailEditorProps> = ({
  initialValue = "",
  onChange,
  style,
  className = "",
  placeholder = "Start writing your email...",
  variables = DEFAULT_VARIABLES,
  defaultPadding = "24px"
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const variablesRef = useRef<HTMLDivElement>(null);
  const paddingPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [currentFont, setCurrentFont] = useState<string>('Arial');
  const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
  
  // Padding state for individual sides
  const [paddings, setPaddings] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [showPaddingPicker, setShowPaddingPicker] = useState(false);

  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

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
    document.execCommand('fontSize', false, '7');
    if (contentRef.current) {
        const fontElements = contentRef.current.querySelectorAll('font[size="7"]');
        fontElements.forEach(el => {
            el.removeAttribute('size');
            (el as HTMLElement).style.fontSize = size;
        });
    }
    if (contentRef.current) {
      contentRef.current.focus();
    }
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

  const addImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          execCommand("insertImage", base64);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const ToolbarButton = ({ 
    icon: Icon, 
    command, 
    value, 
    isActive,
    label 
  }: { 
    icon: React.ElementType, 
    command: string, 
    value?: string, 
    isActive?: boolean,
    label?: string
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        if (command === "createLink") addLink();
        else if (command === "insertImage") addImage();
        else execCommand(command, value);
      }}
      className={`ree-btn ${isActive ? 'active' : ''}`}
      title={label}
    >
      <Icon size={18} />
    </button>
  );

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
        <div className="ree-group">
          <ToolbarButton icon={Undo} command="undo" label="Undo" />
          <ToolbarButton icon={Redo} command="redo" label="Redo" />
        </div>
        
        {/* Font Family Selector */}
        <div className="ree-group">
          <div className="ree-select-wrapper">
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
        </div>

        {/* Font Size Selector */}
        <div className="ree-group">
          <div className="ree-select-wrapper">
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
        </div>

        {/* Padding Selector Dropdown */}
        <div className="ree-group ree-dropdown-container" ref={paddingPickerRef}>
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

        {/* Text Color Picker */}
        <div className="ree-group ree-dropdown-container" ref={colorPickerRef}>
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

        {/* Variables Picker */}
        <div className="ree-group ree-dropdown-container" ref={variablesRef}>
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

        <div className="ree-group">
          <ToolbarButton icon={Heading1} command="formatBlock" value="H1" label="Heading 1" />
          <ToolbarButton icon={Heading2} command="formatBlock" value="H2" label="Heading 2" />
          <ToolbarButton icon={Type} command="formatBlock" value="P" label="Paragraph" />
        </div>

        <div className="ree-group">
          <ToolbarButton icon={Bold} command="bold" isActive={activeFormats.includes('bold')} label="Bold" />
          <ToolbarButton icon={Italic} command="italic" isActive={activeFormats.includes('italic')} label="Italic" />
          <ToolbarButton icon={Underline} command="underline" isActive={activeFormats.includes('underline')} label="Underline" />
          <ToolbarButton icon={Strikethrough} command="strikeThrough" isActive={activeFormats.includes('strikeThrough')} label="Strikethrough" />
        </div>

        <div className="ree-group">
          <ToolbarButton icon={AlignLeft} command="justifyLeft" isActive={activeFormats.includes('justifyLeft')} label="Align Left" />
          <ToolbarButton icon={AlignCenter} command="justifyCenter" isActive={activeFormats.includes('justifyCenter')} label="Align Center" />
          <ToolbarButton icon={AlignRight} command="justifyRight" isActive={activeFormats.includes('justifyRight')} label="Align Right" />
          <ToolbarButton icon={AlignJustify} command="justifyFull" isActive={activeFormats.includes('justifyFull')} label="Justify" />
        </div>

        <div className="ree-group">
          <ToolbarButton icon={List} command="insertUnorderedList" isActive={activeFormats.includes('insertUnorderedList')} label="Bullet List" />
          <ToolbarButton icon={ListOrdered} command="insertOrderedList" isActive={activeFormats.includes('insertOrderedList')} label="Ordered List" />
        </div>

        <div className="ree-group" style={{ borderRight: 'none' }}>
          <ToolbarButton icon={LinkIcon} command="createLink" label="Link" />
          <ToolbarButton icon={ImageIcon} command="insertImage" label="Image" />
          <ToolbarButton icon={Quote} command="formatBlock" value="BLOCKQUOTE" label="Quote" />
          <ToolbarButton icon={Eraser} command="removeFormat" label="Clear Formatting" />
        </div>
      </div>

      {/* Editor Surface */}
      <div 
        className="ree-editor-area"
        onClick={() => contentRef.current?.focus()}
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
      </div>
    </div>
  );
};