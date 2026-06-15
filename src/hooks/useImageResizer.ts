import React, { useState, useEffect, useCallback } from "react";

export function useImageResizer(
  contentRef: React.RefObject<HTMLDivElement | null>,
  resizerRef: React.RefObject<HTMLDivElement | null>,
  onSave?: () => void
) {
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [resizeState, setResizeState] = useState<{
    w: number;
    h: number;
    x: number;
    y: number;
    dir: string;
    aspectRatio: number;
  } | null>(null);

  // Update Resizer Position
  const updateResizer = useCallback(() => {
    if (selectedImg && resizerRef.current && contentRef.current) {
      const containerRect = contentRef.current.getBoundingClientRect();
      const imgRect = selectedImg.getBoundingClientRect();
      
      const top = imgRect.top - containerRect.top + contentRef.current.scrollTop;
      const left = imgRect.left - containerRect.left + contentRef.current.scrollLeft;
      
      resizerRef.current.style.top = `${top}px`;
      resizerRef.current.style.left = `${left}px`;
      resizerRef.current.style.width = `${imgRect.width}px`;
      resizerRef.current.style.height = `${imgRect.height}px`;
    }
  }, [selectedImg, resizerRef, contentRef]);

  // Hook up scroll listener to update resizer
  useEffect(() => {
    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('scroll', updateResizer);
      return () => contentEl.removeEventListener('scroll', updateResizer);
    }
  }, [contentRef, updateResizer]);

  useEffect(() => {
    updateResizer();
    window.addEventListener('resize', updateResizer);
    return () => window.removeEventListener('resize', updateResizer);
  }, [selectedImg, updateResizer]);

  // Handle click outside images (except on color/padding picker etc which are handled by their own hooks/effects)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Deselect image if clicking outside image and outside resizer
      if (selectedImg && contentRef.current?.contains(event.target as Node)) {
        if (event.target !== selectedImg) {
          setSelectedImg(null);
        }
      } else if (selectedImg && !contentRef.current?.contains(event.target as Node)) {
        // Clicked totally outside editor
        setSelectedImg(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedImg, contentRef]);

  // Resize Drag Handlers
  const handleResizeMouseDown = (e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg) return;
    
    const w = selectedImg.offsetWidth;
    const h = selectedImg.offsetHeight;
    
    setResizeState({
      w,
      h,
      x: e.clientX,
      y: e.clientY,
      dir,
      aspectRatio: h > 0 ? w / h : 1
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeState || !selectedImg) return;

      const deltaX = e.clientX - resizeState.x;
      const deltaY = e.clientY - resizeState.y;

      let newWidth = resizeState.w;
      let newHeight = resizeState.h;

      // Determine which axis movement is dominant to guide the aspect-locked resizing
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (resizeState.dir.includes('e')) newWidth += deltaX;
        if (resizeState.dir.includes('w')) newWidth -= deltaX;
        newHeight = Math.round(newWidth / resizeState.aspectRatio);
      } else {
        if (resizeState.dir.includes('s')) newHeight += deltaY;
        if (resizeState.dir.includes('n')) newHeight -= deltaY;
        newWidth = Math.round(newHeight * resizeState.aspectRatio);
      }

      // Enforce minimum size constraint on BOTH dimensions
      if (newWidth > 20 && newHeight > 20) {
        selectedImg.style.width = `${newWidth}px`;
        selectedImg.style.height = `${newHeight}px`;
        
        // Also update attributes for better email client compatibility
        selectedImg.setAttribute('width', Math.round(newWidth).toString());
        selectedImg.setAttribute('height', Math.round(newHeight).toString());
        
        updateResizer();
      }
    };

    const handleMouseUp = () => {
      if (resizeState) {
        setResizeState(null);
        if (onSave) onSave();
      }
    };

    if (resizeState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, selectedImg, updateResizer, onSave]);

  return {
    selectedImg,
    setSelectedImg,
    handleResizeMouseDown,
    updateResizer
  };
}
