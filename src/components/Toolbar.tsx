"use client";
import { useEditorState, type Editor } from "@tiptap/react";

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-sm disabled:opacity-40 ${active ? "bg-brand-100 text-brand-700" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}
const Sep = () => <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />;

export function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"), ordered: e.isActive("orderedList"), quote: e.isActive("blockquote"),
      h1: e.isActive("heading", { level: 1 }), h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
      left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }), right: e.isActive({ textAlign: "right" }),
      canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const heading = s.h1 ? "1" : s.h2 ? "2" : s.h3 ? "3" : "0";

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-3 py-1.5">
      <Btn label="Undo" disabled={disabled || !s.canUndo} onClick={() => c().undo().run()}>↶</Btn>
      <Btn label="Redo" disabled={disabled || !s.canRedo} onClick={() => c().redo().run()}>↷</Btn>
      <Sep />
      <select
        aria-label="Text style"
        disabled={disabled}
        value={heading}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "0") c().setParagraph().run();
          else c().setHeading({ level: Number(v) as 1 | 2 | 3 }).run();
        }}
        className="h-8 rounded border border-slate-200 bg-white px-2 text-sm"
      >
        <option value="0">Normal text</option>
        <option value="1">Heading 1 (large)</option>
        <option value="2">Heading 2 (medium)</option>
        <option value="3">Heading 3 (small)</option>
      </select>
      <Sep />
      <Btn label="Bold" active={s.bold} disabled={disabled} onClick={() => c().toggleBold().run()}><b>B</b></Btn>
      <Btn label="Italic" active={s.italic} disabled={disabled} onClick={() => c().toggleItalic().run()}><i>I</i></Btn>
      <Btn label="Underline" active={s.underline} disabled={disabled} onClick={() => c().toggleUnderline().run()}><u>U</u></Btn>
      <Btn label="Strikethrough" active={s.strike} disabled={disabled} onClick={() => c().toggleStrike().run()}><s>S</s></Btn>
      <Sep />
      <Btn label="Bulleted list" active={s.bullet} disabled={disabled} onClick={() => c().toggleBulletList().run()}>• List</Btn>
      <Btn label="Numbered list" active={s.ordered} disabled={disabled} onClick={() => c().toggleOrderedList().run()}>1. List</Btn>
      <Btn label="Quote" active={s.quote} disabled={disabled} onClick={() => c().toggleBlockquote().run()}>“ ”</Btn>
      <Sep />
      <Btn label="Align left" active={s.left} disabled={disabled} onClick={() => c().setTextAlign("left").run()}>⇤</Btn>
      <Btn label="Align center" active={s.center} disabled={disabled} onClick={() => c().setTextAlign("center").run()}>↔</Btn>
      <Btn label="Align right" active={s.right} disabled={disabled} onClick={() => c().setTextAlign("right").run()}>⇥</Btn>
    </div>
  );
}
