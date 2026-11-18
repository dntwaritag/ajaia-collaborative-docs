import { describe, it, expect } from "vitest";
import { importFile, MAX_UPLOAD_BYTES, titleFromFilename } from "@/lib/import";
import { createDocSchema, emailSchema, titleSchema, updateDocSchema } from "@/lib/validation";

const file = (name: string, text: string, type = "text/plain") => {
  const bytes = new TextEncoder().encode(text);
  return { name, type, size: bytes.length, bytes };
};
const err = async (p: Promise<unknown>) => { try { await p; return null; } catch (e) { return e as { code: string; message: string }; } };

describe("importFile", () => {
  it("imports .txt into paragraphs", async () => {
    const r = await importFile(file("meeting_notes.txt", "Hello <b>world</b>\n\nSecond para"));
    expect(r.title).toBe("meeting notes");
    expect(r.content.content).toHaveLength(2);
    expect(JSON.stringify(r.content)).toContain("Hello <b>world</b>"); // escaped, not interpreted as HTML
  });

  it("imports .md preserving headings, bold and lists", async () => {
    const r = await importFile(file("readme.md", "# Heading\n\nSome **bold** text\n\n- one\n- two\n\n1. a\n2. b", "text/markdown"));
    const s = JSON.stringify(r.content);
    expect(s).toContain('"type":"heading"');
    expect(s).toContain('"type":"bold"');
    expect(s).toContain('"type":"bulletList"');
    expect(s).toContain('"type":"orderedList"');
  });

  it("rejects unsupported extensions, mismatched MIME types, empty and oversized files", async () => {
    expect((await err(importFile(file("a.exe", "x"))))?.code).toBe("UNSUPPORTED");
    expect((await err(importFile(file("a.pdf", "x", "application/pdf"))))?.code).toBe("UNSUPPORTED");
    expect((await err(importFile(file("a.txt", "x", "image/png"))))?.code).toBe("UNSUPPORTED");
    expect((await err(importFile(file("a.txt", ""))))?.code).toBe("BAD_REQUEST");
    const big = { name: "a.txt", type: "text/plain", size: MAX_UPLOAD_BYTES + 1, bytes: new Uint8Array(1) };
    expect((await err(importFile(big)))?.code).toBe("TOO_LARGE");
  });

  it("rejects fake .docx files and binary garbage as text", async () => {
    const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    expect((await err(importFile(file("a.docx", "not a zip", docx))))?.code).toBe("UNSUPPORTED");
    const bad = { name: "a.txt", type: "text/plain", size: 3, bytes: new Uint8Array([0xff, 0xfe, 0xfd]) };
    expect((await err(importFile(bad)))?.code).toBe("BAD_REQUEST");
  });

  it("derives a safe title from the filename", () => {
    expect(titleFromFilename("my-file_name.final.md")).toBe("my file name.final");
  });
});

describe("validation", () => {
  it("rejects empty titles and bad emails", () => {
    expect(titleSchema.safeParse("   ").success).toBe(false);
    expect(titleSchema.safeParse("  Hi ").data).toBe("Hi");
    expect(emailSchema.safeParse("nope").success).toBe(false);
    expect(emailSchema.safeParse(" A@B.co ").data).toBe("a@b.co");
  });
  it("requires a valid editor document for content", () => {
    expect(createDocSchema.safeParse({ content: "<p>x</p>" }).success).toBe(false);
    expect(updateDocSchema.safeParse({}).success).toBe(false);
    expect(updateDocSchema.safeParse({ content: { type: "doc", content: [] } }).success).toBe(true);
  });
});
