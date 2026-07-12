import React, { useRef } from "react";
import { Image as ImageIcon } from "lucide-react";

export interface ImagePickerProps {
  show: boolean;
  onToggle: () => void;
  onUploadClick: () => void;
  onUrlClick: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ImagePicker({
  show,
  onToggle,
  onUploadClick,
  onUrlClick,
  containerRef,
}: ImagePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="ree-dropdown-container" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={`ree-btn ${show ? "active" : ""}`}
        title="Insert Image"
        aria-label="Insert Image"
        aria-expanded={show}
        aria-haspopup="dialog"
      >
        <ImageIcon size={18} aria-hidden="true" />
      </button>

      {show && (
        <div
          className="ree-popup"
          role="dialog"
          aria-label="Insert image"
          style={{ width: "200px", padding: "4px" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onToggle();
              triggerRef.current?.focus();
            }
          }}
        >
          <button type="button" className="ree-list-btn" onClick={onUploadClick}>
            Upload from Device
          </button>
          <button type="button" className="ree-list-btn" onClick={onUrlClick}>
            Insert via URL
          </button>
        </div>
      )}
    </div>
  );
}
