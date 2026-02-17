"use client";

import { useEffect, useState } from "react";
import PatchNoteMarkdown from "@/components/patch-note-markdown";

type PatchNoteEditorModalProps = {
  open: boolean;
  initialValue: string;
  isSaving: boolean;
  error?: string | null;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
};

export default function PatchNoteEditorModal({
  open,
  initialValue,
  isSaving,
  error,
  title,
  submitLabel,
  onClose,
  onSubmit,
}: PatchNoteEditorModalProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [content, setContent] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setContent(initialValue);
      setTab("write");
    }
  }, [initialValue, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-md border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="text-xs text-neutral-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`rounded border px-3 py-1 ${tab === "write" ? "border-black text-black" : "border-neutral-300 text-neutral-600"}`}
          >
            write
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`rounded border px-3 py-1 ${tab === "preview" ? "border-black text-black" : "border-neutral-300 text-neutral-600"}`}
          >
            preview
          </button>
        </div>

        <div className="mt-4">
          {tab === "write" ? (
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={14}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Write patch notes in markdown..."
            />
          ) : (
            <div className="min-h-[280px] rounded border border-neutral-200 p-3">
              <PatchNoteMarkdown content={content || "_Nothing to preview yet._"} />
            </div>
          )}
        </div>

        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-neutral-300 px-3 py-2 text-xs">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit(content)}
            disabled={isSaving}
            className="rounded bg-black px-3 py-2 text-xs text-white disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

