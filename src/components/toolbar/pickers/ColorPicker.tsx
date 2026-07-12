import React, { useRef } from "react";
import { Palette } from "lucide-react";
import { PRESET_COLORS } from "../../../constants";

export interface ColorPickerProps {
  activeColor: string;
  show: boolean;
  onToggle: () => void;
  onPick: (color: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ColorPicker({
  activeColor,
  show,
  onToggle,
  onPick,
  containerRef,
}: ColorPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="ree-dropdown-container" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={`ree-btn ${show ? "active" : ""}`}
        title="Text Color"
        aria-label="Text Color"
        aria-expanded={show}
        aria-haspopup="dialog"
      >
        <Palette
          size={18}
          aria-hidden="true"
          style={{
            color:
              activeColor && activeColor !== "rgb(0, 0, 0)" && activeColor !== "#000000"
                ? activeColor
                : "inherit",
          }}
        />
      </button>

      {show && (
        <div
          className="ree-popup"
          role="dialog"
          aria-label="Text color"
          style={{ width: "220px" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onToggle();
              triggerRef.current?.focus();
            }
          }}
        >
          <div className="ree-label">Presets</div>
          <div className="ree-grid">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="ree-color-swatch"
                style={{ backgroundColor: color }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(color);
                }}
                title={color}
                aria-label={color}
              />
            ))}
          </div>
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginTop: "8px" }}>
            <div className="ree-label">Custom</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="color"
                className="ree-color-input"
                onChange={(e) => {
                  onPick(e.target.value);
                }}
                title="Choose custom color"
                aria-label="Choose custom color"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
