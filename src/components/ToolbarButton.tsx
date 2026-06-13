import React from "react";

interface ToolbarButtonProps {
  icon: React.ComponentType<any>;
  onMouseDown: (e: React.MouseEvent) => void;
  isActive?: boolean;
  label?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon: Icon,
  onMouseDown,
  isActive = false,
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
    >
      <Icon size={18} />
    </button>
  );
};
