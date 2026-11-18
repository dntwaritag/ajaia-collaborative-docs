import { marked } from "marked";
import mammoth from "mammoth";
import { generateJSON } from "@tiptap/html/server";
import { sharedExtensions } from "./extensions";
import { ServiceError } from "./errors";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const SUPPORTED_TYPES = [".txt", ".md", ".docx"] as const;

const MIME: Record<string, string[]> = {
  ".txt": ["text/plain", ""],
  ".md": ["text/markdown", "text/x-markdown", "text/plain", "application/octet-stream", ""],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream", ""],
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function extensionOf(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export function titleFromFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (base || "Imported document").slice(0, 200);
}

/** Validate an uploaded file and convert it to TipTap JSON. Throws ServiceError with a friendly message. */
export async function importFile(file: { name: string; type: string; size: number; bytes: Uint8Array }) {
  const ext = extensionOf(file.name);
  if (!(SUPPORTED_TYPES as readonly string[]).includes(ext)) {
    throw new ServiceError("UNSUPPORTED", `Unsupported file type "${ext || "unknown"}". Supported types: ${SUPPORTED_TYPES.join(", ")}.`);
  }
  if (!MIME[ext].includes(file.type)) {
    throw new ServiceError("UNSUPPORTED", `This file's content type (${file.type}) does not match ${ext}.`);
  }
  if (file.size === 0) throw new ServiceError("BAD_REQUEST", "The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ServiceError("TOO_LARGE", `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }

  let html: string;
  if (ext === ".docx") {
    if (file.bytes[0] !== 0x50 || file.bytes[1] !== 0x4b) throw new ServiceError("UNSUPPORTED", "This file is not a valid .docx document.");
    try {
      html = (await mammoth.convertToHtml({ buffer: Buffer.from(file.bytes) })).value;
    } catch {
      throw new ServiceError("BAD_REQUEST", "Could not read this .docx file. It may be corrupted.");
    }
  } else {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(file.bytes);
    } catch {
      throw new ServiceError("BAD_REQUEST", "This file is not valid UTF-8 text.");
    }
    text = text.replace(/^﻿/, "");
    if (ext === ".md") {
      html = await marked.parse(text, { async: true, gfm: true });
    } else {
      html = text
        .replace(/\r\n?/g, "\n")
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
        .join("");
    }
  }
  const content = generateJSON(html || "<p></p>", sharedExtensions);
  if (!content.content || content.content.length === 0) content.content = [{ type: "paragraph" }];
  return { title: titleFromFilename(file.name), content };
}
