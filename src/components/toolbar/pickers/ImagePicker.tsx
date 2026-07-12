import React, { useRef, useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";

export interface ImagePickerProps {
  show: boolean;
  onToggle: () => void;
  onUploadClick: () => void;
  /** Insert image from a URL with alt text. */
  onInsertUrl: (url: string, alt: string) => void;
  /** Prefill for the alt field (from `defaultImageAlt`). */
  defaultAlt?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ImagePicker({
  show,
  onToggle,
  onUploadClick,
  onInsertUrl,
  defaultAlt = "",
  containerRef,
}: ImagePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState(defaultAlt);

  // Reset form when the picker opens so each open starts clean
  useEffect(() => {
    if (show) {
      setUrl("");
      setAlt(defaultAlt);
    }
  }, [show, defaultAlt]);

  const handleApply = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onInsertUrl(trimmed, alt);
  };

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
          style={{ width: "260px", padding: "0" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onToggle();
              triggerRef.current?.focus();
            }
          }}
        >
          <div style={{ padding: "4px" }}>
            <button type="button" className="ree-list-btn" onClick={onUploadClick}>
              Upload from Device
            </button>
          </div>
          <div style={{ borderTop: "1px solid #e5e7eb", padding: "10px 12px" }}>
            <label
              className="ree-label"
              style={{ display: "block", marginBottom: 6, textTransform: "none", letterSpacing: 0 }}
            >
              Image URL
            </label>
            <input
              type="text"
              className="ree-link-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
              placeholder="https://…"
              autoFocus
            />
            <label
              className="ree-label"
              style={{
                display: "block",
                marginTop: 10,
                marginBottom: 6,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Alt text
            </label>
            <input
              type="text"
              className="ree-link-input"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
              placeholder="Describe the image (optional)"
              aria-label="Image alt text"
            />
            <button
              type="button"
              className="ree-list-btn"
              style={{
                width: "100%",
                textAlign: "center",
                backgroundColor: "#2563eb",
                color: "#fff",
                fontWeight: 500,
                marginTop: 10,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleApply();
              }}
            >
              Insert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
