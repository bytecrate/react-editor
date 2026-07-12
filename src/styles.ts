export const EDITOR_STYLES = `
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

  .ree-link-input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    font-size: 14px;
    color: #111827;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    outline: none;
    background: #fff;
  }

  .ree-link-input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
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

  /* Resizer Styles */
  .ree-resizer {
    position: absolute;
    border: 2px solid #3b82f6;
    pointer-events: none;
    z-index: 40;
    display: none;
  }
  
  .ree-resizer.active {
    display: block;
  }

  .ree-resize-handle {
    width: 10px;
    height: 10px;
    background-color: white;
    border: 1px solid #3b82f6;
    position: absolute;
    pointer-events: auto;
    z-index: 41;
  }

  .ree-handle-se { bottom: -6px; right: -6px; cursor: se-resize; }
  .ree-handle-sw { bottom: -6px; left: -6px; cursor: sw-resize; }
  .ree-handle-ne { top: -6px; right: -6px; cursor: ne-resize; }
  .ree-handle-nw { top: -6px; left: -6px; cursor: nw-resize; }

  /* Editor Content Styles */
  .ree-content ul { list-style-type: disc; padding-left: 1.5em; margin: 1em 0; }
  .ree-content ol { list-style-type: decimal; padding-left: 1.5em; margin: 1em 0; }
  .ree-content h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  .ree-content h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; }
  .ree-content p { margin: 1em 0; }
  .ree-content blockquote { border-left: 4px solid #e5e7eb; margin: 1em 0; padding-left: 1em; color: #4b5563; font-style: italic; }
  .ree-content a { color: #2563eb; text-decoration: underline; }
  .ree-content img { max-width: 100%; height: auto; border-radius: 4px; cursor: pointer; }
`;
