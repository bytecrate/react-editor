import { describe, it, expect } from "vitest";
import {
  createMergeTagElement,
  hydrateMergeTags,
  serializeMergeTags,
  isMergeTagNode,
} from "./mergeTags";
import type { Variable } from "../types";

const VARIABLES: Variable[] = [
  { label: "First Name", value: "{{firstName}}" },
  { label: "Last Name", value: "{{lastName}}" },
];

describe("createMergeTagElement", () => {
  it("builds a non-editable chip with label display and token in data attribute", () => {
    const el = createMergeTagElement({ label: "First Name", value: "{{firstName}}" });

    expect(el.tagName).toBe("SPAN");
    expect(el.className).toBe("ree-merge-tag");
    expect(el.contentEditable).toBe("false");
    expect(el.dataset.mergeTag).toBe("{{firstName}}");
    expect(el.getAttribute("data-merge-tag")).toBe("{{firstName}}");
    expect(el.textContent).toBe("First Name");
    expect(el.title).toBe("{{firstName}}");
  });

  it("falls back to value for display when label is empty", () => {
    const el = createMergeTagElement({ label: "", value: "{{token}}" });
    expect(el.textContent).toBe("{{token}}");
  });
});

describe("isMergeTagNode", () => {
  it("returns true for chip elements", () => {
    const el = createMergeTagElement({ label: "X", value: "{{x}}" });
    expect(isMergeTagNode(el)).toBe(true);
  });

  it("returns false for plain spans and text", () => {
    const span = document.createElement("span");
    span.textContent = "{{x}}";
    expect(isMergeTagNode(span)).toBe(false);
    expect(isMergeTagNode(document.createTextNode("{{x}}"))).toBe(false);
  });
});

describe("hydrateMergeTags / serializeMergeTags", () => {
  it("round-trips: hydrate then serialize preserves tokens", () => {
    const html = "<p>Hello {{firstName}}</p>";
    const hydrated = hydrateMergeTags(html, VARIABLES);
    expect(hydrated).toContain('class="ree-merge-tag"');
    expect(hydrated).toContain('data-merge-tag="{{firstName}}"');
    expect(hydrated).toContain("First Name");

    const serialized = serializeMergeTags(hydrated);
    expect(serialized).toBe("<p>Hello {{firstName}}</p>");
  });

  it("hydrates multiple tokens and serializes all back", () => {
    const html = "<p>{{firstName}} {{lastName}}</p>";
    const serialized = serializeMergeTags(hydrateMergeTags(html, VARIABLES));
    expect(serialized).toBe("<p>{{firstName}} {{lastName}}</p>");
  });

  it("hydrates unknown {{tokens}} with token as display text", () => {
    const html = "<p>Hi {{unknown}}</p>";
    const hydrated = hydrateMergeTags(html, VARIABLES);
    expect(hydrated).toContain('data-merge-tag="{{unknown}}"');
    expect(hydrated).toContain("{{unknown}}");
    expect(serializeMergeTags(hydrated)).toBe("<p>Hi {{unknown}}</p>");
  });

  it("does not double-hydrate existing chips", () => {
    const once = hydrateMergeTags("<p>{{firstName}}</p>", VARIABLES);
    const twice = hydrateMergeTags(once, VARIABLES);
    expect(twice).toBe(once);
    // Single chip span
    expect(twice.match(/ree-merge-tag/g)?.length).toBe(1);
  });

  it("serialize is a no-op when there are no chips", () => {
    expect(serializeMergeTags("<p>plain</p>")).toBe("<p>plain</p>");
  });

  it("does not serialize class-only spans without data-merge-tag", () => {
    const html = '<p><span class="ree-merge-tag">First Name</span></p>';
    expect(serializeMergeTags(html)).toBe(html);
  });

  it("does not hydrate tokens inside attributes", () => {
    const html = '<p><a href="{{unsubscribe}}">unsub</a></p>';
    const hydrated = hydrateMergeTags(html, [
      { label: "Unsub", value: "{{unsubscribe}}" },
    ]);
    // href must remain a plain attribute value, not a chip
    expect(hydrated).toMatch(/href="\{\{unsubscribe\}\}"/);
    expect(hydrated).not.toMatch(/<a[^>]*>[\s\S]*ree-merge-tag/);
  });
});
