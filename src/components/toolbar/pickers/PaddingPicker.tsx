import React, { useRef } from "react";
import { Move, Plus, Minus } from "lucide-react";
import type { PaddingSide, Paddings } from "../../../types";

export type { PaddingSide, Paddings };

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
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="ree-dropdown-container" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={`ree-btn ${show ? "active" : ""}`}
        title="Padding & Spacing"
        aria-label="Padding & Spacing"
        aria-expanded={show}
        aria-haspopup="dialog"
      >
        <Move size={18} aria-hidden="true" />
      </button>

      {show && (
        <div
          className="ree-popup"
          role="dialog"
          aria-label="Padding and spacing"
          style={{ width: "200px" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onToggle();
              triggerRef.current?.focus();
            }
          }}
        >
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
                    aria-label={`Decrease ${side} padding`}
                  >
                    <Minus size={10} aria-hidden="true" />
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
                    aria-label={`Increase ${side} padding`}
                  >
                    <Plus size={10} aria-hidden="true" />
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
