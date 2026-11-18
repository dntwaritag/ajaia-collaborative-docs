"use client";
import { useEffect } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog(props: { title: string; message: string; confirmLabel: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title={props.title} onClose={props.onCancel}>
      <p className="mb-6 text-sm text-slate-600">{props.message}</p>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={props.onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={props.onConfirm} disabled={props.busy}>{props.busy ? "Working…" : props.confirmLabel}</button>
      </div>
    </Modal>
  );
}
