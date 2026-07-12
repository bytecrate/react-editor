import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImageResizer } from "./useImageResizer";

describe("useImageResizer", () => {
  it("initializes with selectedImg as null", () => {
    const contentRef = { current: document.createElement("div") };
    const resizerRef = { current: document.createElement("div") };
    const { result } = renderHook(() => useImageResizer(contentRef, resizerRef));

    expect(result.current.selectedImg).toBeNull();
  });

  it("updates selectedImg when setSelectedImg is called", () => {
    const contentRef = { current: document.createElement("div") };
    const resizerRef = { current: document.createElement("div") };
    const { result } = renderHook(() => useImageResizer(contentRef, resizerRef));

    const img = document.createElement("img");
    act(() => {
      result.current.setSelectedImg(img);
    });

    expect(result.current.selectedImg).toBe(img);
  });

  it("triggers onSave callback when resize mouseUp is fired", () => {
    const contentRef = { current: document.createElement("div") };
    const resizerRef = { current: document.createElement("div") };
    const onSave = vi.fn();
    const { result } = renderHook(() => useImageResizer(contentRef, resizerRef, onSave));

    const img = document.createElement("img");
    // Mock dimensions to bypass minimum size checks
    Object.defineProperty(img, "offsetWidth", { value: 100, configurable: true });
    Object.defineProperty(img, "offsetHeight", { value: 100, configurable: true });

    act(() => {
      result.current.setSelectedImg(img);
    });

    // Simulate mouse down on a handle
    const e = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 0,
      clientY: 0,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleResizeMouseDown(e, "se");
    });

    // Simulate mouse up to complete resize
    const mouseUpEvent = new MouseEvent("mouseup");
    act(() => {
      window.dispatchEvent(mouseUpEvent);
    });

    expect(onSave).toHaveBeenCalled();
  });
});
