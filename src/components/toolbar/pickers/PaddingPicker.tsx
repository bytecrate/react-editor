import React from "react";
import { Move, Plus, Minus } from "lucide-react";

export type PaddingSide = "top" | "right" | "bottom" | "left";

export interface Paddings {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PaddingPickerProps {
  paddings: Paddings;
  updatePadding: (side: PaddingSide, value: number) => void;
  show: boolean;
  onToggle: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PaddingPicker({
  paddings,
  updatePadding,
  show,
  onToggle,
  containerRef,
}: PaddingPickerProps) {
  return (
    <div key="padding" className="ree-dropdown-container" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className={`ree-btn ${show ? "active" : ""}`}
        title="Padding & Spacing"
      >
        <Move size={18} />
      </button>

      {show && (
        <div className="ree-popup" style={{ width: "200px" }}>
          <div className="ree-label">Padding (px)</div>
          <div>
            {(["top", "right", "bottom", "left"] as const).map((side) => (
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
                  <span className="ree-pad-val">{paddings[side]}</span>
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
}
