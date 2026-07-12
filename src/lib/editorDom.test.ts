import { describe, it, expect } from "vitest";
import {
  isEditorDomEmpty,
  placeholderInsetFromPadding,
  unwrapLink,
} from "./editorDom";

describe("isEditorDomEmpty", () => {
  it("returns true for an empty element", () => {
    const el = document.createElement("div");
    expect(isEditorDomEmpty(el)).toBe(true);
  });

  it("returns true for browser empty shells with only <br> or empty <p>", () => {
    const el = document.createElement("div");
    el.innerHTML = "<p><br></p>";
    expect(isEditorDomEmpty(el)).toBe(true);
  });

  it("returns false when text is present", () => {
    const el = document.createElement("div");
    el.textContent = "hello";
    expect(isEditorDomEmpty(el)).toBe(false);
  });

  it("returns false when an image is present without text", () => {
    const el = document.createElement("div");
    el.innerHTML = '<img src="x.png" alt="">';
    expect(isEditorDomEmpty(el)).toBe(false);
  });
});

describe("placeholderInsetFromPadding", () => {
  it("parses a single-token px value", () => {
    expect(placeholderInsetFromPadding("24px")).toBe(24);
    expect(placeholderInsetFromPadding(" 12px ")).toBe(12);
  });

  it("falls back to 24 for multi-value or non-px", () => {
    expect(placeholderInsetFromPadding("10px 20px")).toBe(24);
    expect(placeholderInsetFromPadding("1em")).toBe(24);
    expect(placeholderInsetFromPadding("")).toBe(24);
  });
});

describe("unwrapLink", () => {
  it("moves children out of the anchor and removes the anchor", () => {
    const parent = document.createElement("div");
    const anchor = document.createElement("a");
    anchor.href = "https://example.com";
    anchor.textContent = "click me";
    parent.appendChild(anchor);

    unwrapLink(anchor);

    expect(parent.querySelector("a")).toBeNull();
    expect(parent.textContent).toBe("click me");
  });

  it("preserves multiple children and normalizes text", () => {
    const parent = document.createElement("div");
    parent.appendChild(document.createTextNode("before "));
    const anchor = document.createElement("a");
    anchor.href = "https://example.com";
    const bold = document.createElement("b");
    bold.textContent = "linked";
    anchor.appendChild(bold);
    parent.appendChild(anchor);
    parent.appendChild(document.createTextNode(" after"));

    unwrapLink(anchor);

    expect(parent.querySelector("a")).toBeNull();
    expect(parent.querySelector("b")?.textContent).toBe("linked");
    expect(parent.textContent).toBe("before linked after");
  });
});
