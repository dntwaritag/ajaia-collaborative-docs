"use client";
import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { api } from "./api-client";

type Share = { userId: string; name: string; email: string; permission: "VIEWER" | "EDITOR" };

export function ShareDialog({ docId, owner, onClose }: { docId: string; owner: { name: string; email: string }; onClose: () => void }) {
  const toast = useToast();
  const [shares, setShares] = useState<Share[] | null>(null);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEWER" | "EDITOR">("EDITOR");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ shares: Share[] }>(`/api/documents/${docId}/shares`).then((r) => setShares(r.shares)).catch((e) => setError(e.message));
  }, [docId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ shares: Share[] }>(`/api/documents/${docId}/shares`, { method: "POST", body: JSON.stringify({ email, permission }) });
      setShares(r.shares);
      setEmail("");
      toast("success", "Access granted.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(s: Share) {
    try {
      const r = await api<{ shares: Share[] }>(`/api/documents/${docId}/shares/${s.userId}`, { method: "DELETE" });
      setShares(r.shares);
      toast("success", `Removed access for ${s.email}.`);
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  async function change(s: Share, p: Share["permission"]) {
    try {
      const r = await api<{ shares: Share[] }>(`/api/documents/${docId}/shares`, { method: "POST", body: JSON.stringify({ email: s.email, permission: p }) });
      setShares(r.shares);
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  return (
    <Modal title="Share document" onClose={onClose}>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input type="email" required aria-label="Email to share with" placeholder="Add person by email" className="input min-w-0 flex-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select aria-label="Permission" className="input w-auto" value={permission} onChange={(e) => setPermission(e.target.value as "VIEWER" | "EDITOR")}>
          <option value="EDITOR">Can edit</option>
          <option value="VIEWER">Can view</option>
        </select>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Sharing…" : "Share"}</button>
      </form>
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <h3 className="mb-2 mt-5 text-sm font-medium">People with access</h3>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200" data-testid="access-list">
        <li className="flex items-center justify-between px-3 py-2 text-sm">
          <span>{owner.name} <span className="text-slate-500">({owner.email})</span></span>
          <span className="text-xs text-slate-500">Owner</span>
        </li>
        {shares === null && <li className="px-3 py-2 text-sm text-slate-500">Loading…</li>}
        {shares?.map((s) => (
          <li key={s.userId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{s.name} <span className="text-slate-500">({s.email})</span></span>
            <span className="flex shrink-0 items-center gap-2">
              <select aria-label={`Permission for ${s.email}`} className="rounded border border-slate-200 px-1 py-0.5 text-xs" value={s.permission} onChange={(e) => change(s, e.target.value as Share["permission"])}>
                <option value="EDITOR">Can edit</option>
                <option value="VIEWER">Can view</option>
              </select>
              <button className="text-xs text-red-600 hover:underline" onClick={() => revoke(s)}>Revoke</button>
            </span>
          </li>
        ))}
      </ul>
      {shares?.length === 0 && <p className="mt-2 text-xs text-slate-500">Not shared with anyone yet.</p>}
      <div className="mt-5 flex justify-end"><button className="btn btn-ghost" onClick={onClose}>Done</button></div>
    </Modal>
  );
}
