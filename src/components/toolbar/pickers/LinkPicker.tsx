import React, { useRef } from "react";
import { Link as LinkIcon } from "lucide-react";
import type { Variable } from "../../../types";

export interface LinkPickerProps {
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  isEditingLink: boolean;
  isActive: boolean;
  show: boolean;
  variables: Variable[];
  applyLink: (urlOverride?: string) => void;
  removeLink: () => void;
  applyLinkVariable: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function LinkPicker({
  linkUrl,
  setLinkUrl,
  isEditingLink,
  isActive,
  show,
  variables,
  applyLink,
  removeLink,
  applyLinkVariable,
  onOpen,
  onClose,
  containerRef,
}: LinkPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const linkLabel = isActive || isEditingLink ? "Edit Link" : "Link";

  return (
    <div className="ree-dropdown-container" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onOpen();
        }}
        className={`ree-btn ${show || isActive ? "active" : ""}`}
        title={linkLabel}
        aria-label={linkLabel}
        aria-expanded={show}
        aria-haspopup="dialog"
      >
        <LinkIcon size={18} aria-hidden="true" />
      </button>

      {show && (
        <div
          className="ree-popup"
          role="dialog"
          aria-label={isEditingLink ? "Edit Link" : "Insert Link"}
          style={{ width: "260px", padding: "0" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onClose();
              triggerRef.current?.focus();
            }
          }}
        >
          <div
            className="ree-label"
            style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", margin: 0 }}
          >
            {isEditingLink ? "Edit Link" : "Insert Link"}
          </div>
          <div style={{ padding: "10px 12px" }}>
            <label
              className="ree-label"
              style={{ display: "block", marginBottom: 6, textTransform: "none", letterSpacing: 0 }}
            >
              URL or variable
            </label>
            <input
              type="text"
              className="ree-link-input"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  onClose();
                  triggerRef.current?.focus();
                }
              }}
              placeholder="https://… or {{unsubscribe}}"
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="ree-list-btn"
                style={{
                  flex: 1,
                  textAlign: "center",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  fontWeight: 500,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyLink();
                }}
              >
                {isEditingLink ? "Update" : "Apply"}
              </button>
              {isEditingLink && (
                <button
                  type="button"
                  className="ree-list-btn"
                  style={{ flex: 1, textAlign: "center" }}
                  title="Remove link"
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
            <div style={{ borderTop: "1px solid #e5e7eb" }}>
              <div className="ree-label" style={{ padding: "8px 12px 4px", margin: 0 }}>
                Use variable as URL
              </div>
              <div style={{ maxHeight: 160, overflowY: "auto", padding: "0 4px 4px" }}>
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
                        display: "block",
                        fontSize: 11,
                        color: "#9ca3af",
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
}
