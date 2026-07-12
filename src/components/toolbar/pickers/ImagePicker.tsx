import React from "react";
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
  return (
    <div key="image" className="ree-dropdown-container" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className={`ree-btn ${show ? "active" : ""}`}
        title="Insert Image"
      >
        <ImageIcon size={18} />
      </button>

      {show && (
        <div className="ree-popup" style={{ width: "200px", padding: "4px" }}>
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
