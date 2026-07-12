import React from "react";
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
  return (
    <div className="ree-dropdown-container" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className={`ree-btn ${show ? "active" : ""}`}
        title="Text Color"
      >
        <Palette
          size={18}
          style={{
            color:
              activeColor && activeColor !== "rgb(0, 0, 0)" && activeColor !== "#000000"
                ? activeColor
                : "inherit",
          }}
        />
      </button>

      {show && (
        <div className="ree-popup" style={{ width: "220px" }}>
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
