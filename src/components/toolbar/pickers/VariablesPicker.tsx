import React, { useRef } from "react";
import { Braces } from "lucide-react";
import type { Variable } from "../../../types";

export interface VariablesPickerProps {
  variables: Variable[];
  show: boolean;
  onToggle: () => void;
  onInsert: (variable: Variable) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function VariablesPicker({
  variables,
  show,
  onToggle,
  onInsert,
  containerRef,
}: VariablesPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="ree-dropdown-container" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={`ree-btn ${show ? "active" : ""}`}
        title="Insert Variable"
        aria-label="Insert Variable"
        aria-expanded={show}
        aria-haspopup="menu"
      >
        <Braces size={18} aria-hidden="true" />
      </button>

      {show && (
        <div
          className="ree-popup"
          role="menu"
          aria-label="Insert Variable"
          style={{ width: "200px", padding: "0" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onToggle();
              triggerRef.current?.focus();
            }
          }}
        >
          <div
            className="ree-label"
            style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", margin: 0 }}
          >
            Insert Variable
          </div>
          <div style={{ maxHeight: "240px", overflowY: "auto", padding: "4px" }}>
            {variables.length > 0 ? (
              variables.map((variable) => (
                <button
                  key={variable.value}
                  type="button"
                  role="menuitem"
                  className="ree-list-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onInsert(variable);
                  }}
                >
                  {variable.label}
                </button>
              ))
            ) : (
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "14px",
                  color: "#9ca3af",
                  fontStyle: "italic",
                }}
              >
                No variables available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
