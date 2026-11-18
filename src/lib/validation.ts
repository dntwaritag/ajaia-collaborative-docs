import { z } from "zod";

export const MAX_TITLE = 200;
export const MAX_CONTENT_BYTES = 2 * 1024 * 1024;

export const titleSchema = z
  .string({ error: "Title is required." })
  .trim()
  .min(1, "Title cannot be empty.")
  .max(MAX_TITLE, `Title must be at most ${MAX_TITLE} characters.`);

/** Content must be a ProseMirror/TipTap doc object. We store it as a JSON string. */
export const contentSchema = z
  .custom<Record<string, unknown>>(
    (v) => typeof v === "object" && v !== null && (v as { type?: unknown }).type === "doc",
    "Content must be a valid editor document.",
  )
  .refine((v) => JSON.stringify(v).length <= MAX_CONTENT_BYTES, "Document is too large.");

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const permissionSchema = z.enum(["VIEWER", "EDITOR"], { error: "Permission must be VIEWER or EDITOR." });

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Password is required.") });
export const createDocSchema = z.object({ title: titleSchema.optional(), content: contentSchema.optional() });
export const updateDocSchema = z
  .object({ title: titleSchema.optional(), content: contentSchema.optional() })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update.");
export const shareSchema = z.object({ email: emailSchema, permission: permissionSchema.default("EDITOR") });

export function firstIssue(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Invalid request.";
}
