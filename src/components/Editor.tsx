"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { sharedExtensions } from "@/lib/extensions";
import type { DocFull } from "@/lib/documents";
import { Toolbar } from "./Toolbar";
import { ShareDialog } from "./ShareDialog";
import { useToast } from "./Toast";
import { api } from "./api-client";

type SaveState = "saved" | "unsaved" | "saving" | "error";
const LABEL: Record<SaveState, string> = { saved: "Saved", unsaved: "Unsaved changes…", saving: "Saving…", error: "Save failed — retrying" };
const AUTOSAVE_MS = 1000;

export function Editor({ initial }: { initial: DocFull }) {
  const toast = useToast();
  const canEdit = initial.access === "OWNER" || initial.access === "EDITOR";
  const isOwner = initial.access === "OWNER";
  const [title, setTitle] = useState(initial.title);
  const [titleError, setTitleError] = useState("");
  const [state, setState] = useState<SaveState>("saved");
  const [shareOpen, setShareOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<number>(initial.updatedAt);

  // Pending changes live in refs so the save loop always sees the newest values.
  const dirty = useRef<{ content?: unknown; title?: string }>({});
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTitle = useRef(initial.title);

  const flush = useCallback(async () => {
    if (inFlight.current) return;
    if (Object.keys(dirty.current).length === 0) return;
    const batch = dirty.current;
    dirty.current = {};
    inFlight.current = true;
    setState("saving");
    try {
      const { document } = await api<{ document: DocFull }>(`/api/documents/${initial.id}`, { method: "PATCH", body: JSON.stringify(batch) });
      if (batch.title !== undefined) savedTitle.current = document.title;
      setLastSaved(document.updatedAt);
      inFlight.current = false;
      if (Object.keys(dirty.current).length) { setState("unsaved"); void flush(); } else setState("saved");
    } catch (e) {
      inFlight.current = false;
      // Put the failed batch back (without clobbering newer edits) and retry.
      dirty.current = { ...batch, ...dirty.current };
      setState("error");
      if (batch.title !== undefined && /empty|characters/i.test((e as Error).message)) { setTitleError((e as Error).message); delete dirty.current.title; }
      else toast("error", (e as Error).message);
      if (Object.keys(dirty.current).length) timer.current = setTimeout(() => void flush(), 4000);
      else setState("saved");
    }
  }, [initial.id, toast]);

  const schedule = useCallback(() => {
    setState((s) => (s === "saving" ? s : "unsaved"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  }, [flush]);

  const editor = useEditor({
    extensions: [...sharedExtensions, Placeholder.configure({ placeholder: canEdit ? "Start writing…" : "" })],
    content: initial.content as object,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": "Document content", "data-testid": "editor" } },
    onUpdate: ({ editor }) => {
      dirty.current.content = editor.getJSON();
      schedule();
    },
  });

  // Warn on unload with unsaved changes and flush on tab hide.
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (Object.keys(dirty.current).length || inFlight.current) e.preventDefault(); };
    const hide = () => { if (document.visibilityState === "hidden") void flush(); };
    window.addEventListener("beforeunload", before);
    document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("beforeunload", before); document.removeEventListener("visibilitychange", hide); };
  }, [flush]);

  function commitTitle() {
    const t = title.trim();
    if (!t) { setTitleError("Title cannot be empty."); setTitle(savedTitle.current); return; }
    setTitleError("");
    if (t !== savedTitle.current) { dirty.current.title = t; setTitle(t); if (timer.current) clearTimeout(timer.current); void flush(); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link href="/" className="btn btn-ghost" aria-label="Back to dashboard">← Documents</Link>
        <div className="min-w-0 flex-1">
          <input
            aria-label="Document title"
            className="w-full max-w-xl rounded px-2 py-1 text-lg font-semibold hover:bg-slate-100 focus:bg-white disabled:bg-transparent"
            value={title}
            readOnly={!isOwner}
            title={isOwner ? "Rename document" : "Only the owner can rename"}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            maxLength={200}
          />
          <div className="flex items-center gap-2 px-2 text-xs">
            <span data-testid="save-status" role="status" className={state === "error" ? "text-red-600" : state === "saved" ? "text-emerald-600" : "text-slate-500"}>
              {canEdit ? LABEL[state] : "View only"}
            </span>
            {canEdit && state === "saved" && <span className="text-slate-400">· last saved {new Date(lastSaved).toLocaleTimeString()}</span>}
            {!isOwner && <span className="text-slate-500">· owned by {initial.ownerName} · {canEdit ? "you can edit" : "you can view"}</span>}
          </div>
          {titleError && <p role="alert" className="px-2 text-xs text-red-600">{titleError}</p>}
        </div>
        {isOwner && <button className="btn btn-primary" onClick={() => setShareOpen(true)}>Share</button>}
      </header>

      {editor && <Toolbar editor={editor} disabled={!canEdit} />}
      {!canEdit && <p className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">You have view-only access to this document.</p>}

      <main className="flex-1 overflow-auto px-2 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-lg bg-white px-6 py-8 shadow-sm sm:px-14 sm:py-12">
          {editor ? <EditorContent editor={editor} /> : <div className="h-40 animate-pulse rounded bg-slate-100" aria-label="Loading editor" />}
        </div>
      </main>

      {shareOpen && <ShareDialog docId={initial.id} owner={{ name: initial.ownerName, email: initial.ownerEmail }} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
