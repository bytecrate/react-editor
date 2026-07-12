import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { EmailEditor } from "../../index";

describe("EmailEditor image features (plan 019)", () => {
  let originalExecCommand: typeof document.execCommand;

  beforeAll(() => {
    originalExecCommand = document.execCommand;
    document.queryCommandState = vi.fn().mockReturnValue(false);
    document.queryCommandValue = vi.fn().mockReturnValue("");
  });

  beforeEach(() => {
    // insertHTML path: materialize markup into the contenteditable
    document.execCommand = vi.fn().mockImplementation((command, _show, value) => {
      if (command === "insertHTML" && typeof value === "string") {
        const content = document.querySelector(".ree-content") as HTMLElement | null;
        if (content) {
          content.insertAdjacentHTML("beforeend", value);
          return true;
        }
      }
      if (command === "insertImage" && typeof value === "string") {
        const content = document.querySelector(".ree-content") as HTMLElement | null;
        if (content) {
          const img = document.createElement("img");
          img.src = value;
          content.appendChild(img);
          return true;
        }
      }
      return false;
    });
  });

  afterEach(() => {
    document.execCommand = originalExecCommand;
    vi.restoreAllMocks();
  });

  it("calls onImageUploadError when onImageUpload rejects", async () => {
    const onImageUploadError = vi.fn();
    const onImageUpload = vi.fn().mockRejectedValue(new Error("upload failed"));

    render(
      <EmailEditor onImageUpload={onImageUpload} onImageUploadError={onImageUploadError} />
    );

    fireEvent.click(screen.getByTitle("Insert Image"));
    fireEvent.click(screen.getByText("Upload from Device"));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    const file = new File(["fake-bytes"], "hero.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(onImageUpload).toHaveBeenCalledTimes(1);
      expect(onImageUploadError).toHaveBeenCalledTimes(1);
    });
    expect(onImageUploadError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onImageUploadError.mock.calls[0][0] as Error).message).toBe("upload failed");
  });

  it("does not call onImageUploadError when upload succeeds", async () => {
    const onImageUploadError = vi.fn();
    const onImageUpload = vi.fn().mockResolvedValue("https://cdn.example.com/a.png");

    render(
      <EmailEditor onImageUpload={onImageUpload} onImageUploadError={onImageUploadError} />
    );

    fireEvent.click(screen.getByTitle("Insert Image"));
    fireEvent.click(screen.getByText("Upload from Device"));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(onImageUpload).toHaveBeenCalled();
    });
    expect(onImageUploadError).not.toHaveBeenCalled();
  });

  it("inserts an image with alt text from the URL form", () => {
    render(<EmailEditor defaultImageAlt="Default alt" />);

    fireEvent.click(screen.getByTitle("Insert Image"));

    const urlInput = screen.getByPlaceholderText("https://…");
    const altInput = screen.getByLabelText("Image alt text");

    // defaultImageAlt should prefill the alt field
    expect((altInput as HTMLInputElement).value).toBe("Default alt");

    fireEvent.change(urlInput, { target: { value: "https://example.com/pic.png" } });
    fireEvent.change(altInput, { target: { value: "A product photo" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Insert" }));

    const img = document.querySelector(".ree-content img") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("https://example.com/pic.png");
    expect(img!.getAttribute("alt")).toBe("A product photo");
  });

  it("sets alt from defaultImageAlt / filename on device upload without custom handler", async () => {
    render(<EmailEditor defaultImageAlt="Catalog shot" />);

    // FileReader mock: emit a data URL
    const dataUrl = "data:image/png;base64,abc";
    class MockFileReader {
      result: string | null = null;
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        this.result = dataUrl;
        // Fire async like a real FileReader
        queueMicrotask(() => {
          this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>);
        });
      }
    }
    vi.stubGlobal("FileReader", MockFileReader);

    fireEvent.click(screen.getByTitle("Insert Image"));
    fireEvent.click(screen.getByText("Upload from Device"));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "ignored-name.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      const img = document.querySelector(".ree-content img") as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img!.getAttribute("alt")).toBe("Catalog shot");
      expect(img!.getAttribute("src")).toBe(dataUrl);
    });
  });

  it("wraps a selected image in a link and updates alt", () => {
    render(
      <EmailEditor initialValue='<p><img src="https://example.com/x.png" alt="old" /></p>' />
    );

    const img = document.querySelector(".ree-content img") as HTMLImageElement;
    expect(img).not.toBeNull();
    fireEvent.click(img);

    // Properties bar should appear
    expect(screen.getByRole("group", { name: "Image properties" })).toBeDefined();

    const altField = screen.getByLabelText("Selected image alt text") as HTMLInputElement;
    const linkField = screen.getByLabelText("Selected image link URL") as HTMLInputElement;
    expect(altField.value).toBe("old");
    expect(linkField.value).toBe("");

    fireEvent.change(altField, { target: { value: "New alt" } });
    fireEvent.change(linkField, { target: { value: "https://shop.example.com" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));

    expect(img.getAttribute("alt")).toBe("New alt");
    const parent = img.parentElement;
    expect(parent).toBeInstanceOf(HTMLAnchorElement);
    expect((parent as HTMLAnchorElement).getAttribute("href")).toBe("https://shop.example.com");
    expect((parent as HTMLAnchorElement).getAttribute("target")).toBe("_blank");
    expect((parent as HTMLAnchorElement).getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("unwraps a linked image when link field is cleared and applied", () => {
    render(
      <EmailEditor
        initialValue='<p><a href="https://old.example.com"><img src="https://example.com/x.png" alt="x" /></a></p>'
      />
    );

    const img = document.querySelector(".ree-content img") as HTMLImageElement;
    fireEvent.click(img);

    const linkField = screen.getByLabelText("Selected image link URL") as HTMLInputElement;
    expect(linkField.value).toBe("https://old.example.com");

    fireEvent.change(linkField, { target: { value: "" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));

    expect(img.parentElement?.tagName).not.toBe("A");
    expect(document.querySelector(".ree-content a")).toBeNull();
  });

  it("rejects javascript: image URLs when sanitize is on", () => {
    render(<EmailEditor />);

    fireEvent.click(screen.getByTitle("Insert Image"));
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Insert" }));

    expect(document.querySelector(".ree-content img")).toBeNull();
  });

  it("escapes quotes in src and alt so insertHTML cannot break out of attributes", () => {
    render(<EmailEditor sanitize={false} />);

    fireEvent.click(screen.getByTitle("Insert Image"));
    // sanitize={false} still inserts; escaping must neutralize attribute breakout
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: 'https://example.com/x.png" onerror="alert(1)' },
    });
    fireEvent.change(screen.getByLabelText("Image alt text"), {
      target: { value: 'A "quoted" caption <x>' },
    });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Insert" }));

    const imgs = document.querySelectorAll(".ree-content img");
    expect(imgs.length).toBe(1);
    const img = imgs[0] as HTMLImageElement;
    // No extra attribute injection from the quoted src
    expect(img.getAttribute("onerror")).toBeNull();
    expect(img.getAttribute("src")).toContain("https://example.com/x.png");
    expect(img.getAttribute("alt")).toBe('A "quoted" caption <x>');
  });

  it("rejects javascript: image link wrap and restores the previous href draft", () => {
    render(
      <EmailEditor
        initialValue='<p><a href="https://safe.example.com"><img src="https://example.com/x.png" alt="x" /></a></p>'
      />
    );

    const img = document.querySelector(".ree-content img") as HTMLImageElement;
    fireEvent.click(img);

    const linkField = screen.getByLabelText("Selected image link URL") as HTMLInputElement;
    fireEvent.change(linkField, { target: { value: "javascript:alert(1)" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));

    // Image remains wrapped with the original href
    expect(img.parentElement).toBeInstanceOf(HTMLAnchorElement);
    expect((img.parentElement as HTMLAnchorElement).getAttribute("href")).toBe(
      "https://safe.example.com"
    );
    // Draft restored to the previous valid href
    expect(linkField.value).toBe("https://safe.example.com");
  });

  it("does not call onImageUploadError when onImageUpload resolves to empty string", async () => {
    const onImageUploadError = vi.fn();
    const onImageUpload = vi.fn().mockResolvedValue("");

    render(
      <EmailEditor onImageUpload={onImageUpload} onImageUploadError={onImageUploadError} />
    );

    fireEvent.click(screen.getByTitle("Insert Image"));
    fireEvent.click(screen.getByText("Upload from Device"));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "empty-url.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(onImageUpload).toHaveBeenCalled();
    });
    expect(onImageUploadError).not.toHaveBeenCalled();
    expect(document.querySelector(".ree-content img")).toBeNull();
  });
});
