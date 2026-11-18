"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { ConfirmDialog } from "./Modal";
import { useToast } from "./Toast";
import { api, timeAgo } from "./api-client";
import type { DocSummary } from "@/lib/documents";

type View = "all" | "mine" | "shared" | "recent";
const NAV: { id: View; label: string }[] = [
  { id: "all", label: "All documents" },
  { id: "mine", label: "My Documents" },
  { id: "shared", label: "Shared With Me" },
  { id: "recent", label: "Recent" },
];

export function Dashboard({ user }: { user: { id: string; name: string; email: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<DocSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "create" | "import">("");
  const [toDelete, setToDelete] = useState<DocSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ documents: DocSummary[] }>(`/api/documents?view=${view}&q=${encodeURIComponent(q)}`);
      setDocs(res.documents);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [view, q]);

  useEffect(() => {
    setDocs(null);
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function create() {
    setBusy("create");
    try {
      const { document } = await api<{ document: DocSummary }>("/api/documents", { method: "POST", body: JSON.stringify({}) });
      router.push(`/docs/${document.id}`);
    } catch (e) {
      toast("error", (e as Error).message);
      setBusy("");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("import");
    try {
      const form = new FormData();
      form.append("file", file);
      const { document } = await api<{ document: DocSummary }>("/api/documents/import", { method: "POST", body: form });
      toast("success", `Imported “${document.title}”.`);
      router.push(`/docs/${document.id}`);
    } catch (err) {
      toast("error", (err as Error).message);
      setBusy("");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/documents/${toDelete.id}`, { method: "DELETE" });
      toast("success", "Document deleted.");
      setToDelete(null);
      await load();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white p-4 md:w-60 md:border-b-0 md:border-r">
        <Logo />
        <button className="btn btn-primary mt-5 w-full" onClick={create} disabled={!!busy}>
          {busy === "create" ? "Creating…" : "+ New document"}
        </button>
        <button className="btn btn-ghost mt-2 w-full" onClick={() => fileRef.current?.click()} disabled={!!busy}>
          {busy === "import" ? "Importing…" : "Import file"}
        </button>
        <input ref={fileRef} type="file" accept=".txt,.md,.docx" className="hidden" onChange={onFile} aria-label="Import file" />
        <p className="mt-1.5 text-xs text-slate-500">Supported: .txt, .md, .docx (max 2 MB)</p>
        <nav className="mt-5 flex gap-1 overflow-x-auto md:flex-col" aria-label="Document views">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              aria-current={view === n.id}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${view === n.id ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <input type="search" aria-label="Search documents" placeholder="Search documents by title…" className="input max-w-md flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <div className="font-medium" data-testid="current-user">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <button className="btn btn-ghost" onClick={signOut}>Sign out / switch</button>
          </div>
        </header>

        <h1 className="mb-4 text-xl font-semibold">{NAV.find((n) => n.id === view)!.label}</h1>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {docs === null ? (
            <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading documents">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}
            </div>
          ) : docs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-medium">{q ? "No documents match your search." : view === "shared" ? "Nothing has been shared with you yet." : "No documents yet."}</p>
              <p className="mt-1 text-sm text-slate-500">
                {q ? "Try a different title." : view === "shared" ? "When someone shares a document with you, it will appear here." : "Create a new document or import a .txt, .md or .docx file to get started."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Owner</th>
                  <th className="hidden px-4 py-3 md:table-cell">Last modified</th>
                  <th className="px-4 py-3">Sharing</th>
                  <th className="w-20 px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50" data-testid="doc-row">
                    <td className="px-4 py-3">
                      <Link href={`/docs/${d.id}`} className="font-medium text-slate-900 hover:text-brand-600">{d.title}</Link>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{d.access === "OWNER" ? "Me" : d.ownerName}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{timeAgo(d.updatedAt)}</td>
                    <td className="px-4 py-3"><Badge d={d} /></td>
                    <td className="px-4 py-3 text-right">
                      {d.access === "OWNER" && (
                        <button className="text-xs text-red-600 hover:underline" onClick={() => setToDelete(d)} aria-label={`Delete ${d.title}`}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {toDelete && (
        <ConfirmDialog
          title="Delete document?"
          message={`“${toDelete.title}” and its sharing settings will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

function Badge({ d }: { d: DocSummary }) {
  if (d.access === "OWNER")
    return (
      <span className="inline-flex gap-1.5">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Owned</span>
        {d.sharedCount > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">Shared with {d.sharedCount}</span>}
      </span>
    );
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
      Shared by {d.ownerName.split(" ")[0]} · {d.access === "EDITOR" ? "Can edit" : "View only"}
    </span>
  );
}
