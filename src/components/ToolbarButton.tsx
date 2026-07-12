import React from "react";

interface ToolbarButtonProps {
  icon: React.ComponentType<any>;
  onMouseDown: (e: React.MouseEvent) => void;
  /** When provided, marks this as a toggle and sets aria-pressed. */
  isActive?: boolean;
  label?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon: Icon,
  onMouseDown,
  isActive,
  label
}) => {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown(e);
      }}
      className={`ree-btn ${isActive ? 'active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={isActive !== undefined ? isActive : undefined}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
};
