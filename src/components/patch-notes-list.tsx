"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PatchNoteMarkdown from "@/components/patch-note-markdown";

export type PatchNoteSummary = {
  id: string;
  publishedAt: string;
  updatedAt: string;
  firstLine: string;
};

export type PatchNoteEntry = PatchNoteSummary & {
  content: string;
};

type PatchNotesListProps = {
  notes: PatchNoteSummary[];
  editable?: boolean;
  onRequestEdit?: (note: PatchNoteEntry) => void;
  onRequestDelete?: (note: PatchNoteSummary) => void;
};

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  return date.toLocaleString();
}

export default function PatchNotesList({
  notes,
  editable = false,
  onRequestEdit,
  onRequestDelete,
}: PatchNotesListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [contentById, setContentById] = useState<Record<string, string>>({});
  const [loadingById, setLoadingById] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  useEffect(() => {
    const validIds = new Set(notes.map((note) => note.id));
    setExpanded((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => validIds.has(id))),
    );
    setContentById((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => validIds.has(id))),
    );
    setLoadingById((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => validIds.has(id))),
    );
    setErrorById((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => validIds.has(id))),
    );
  }, [notes]);

  const fetchNote = useCallback(async (id: string): Promise<PatchNoteEntry | undefined> => {
    setLoadingById((current) => ({ ...current, [id]: true }));
    setErrorById((current) => ({ ...current, [id]: "" }));
    try {
      const response = await fetch(`/api/patch-notes/${id}`);
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setErrorById((current) => ({ ...current, [id]: payload.error ?? "Failed to load note." }));
        return undefined;
      }
      const payload = (await response.json()) as { note: PatchNoteEntry };
      setContentById((current) => ({ ...current, [id]: payload.note.content }));
      return payload.note;
    } finally {
      setLoadingById((current) => ({ ...current, [id]: false }));
    }
  }, []);

  const orderedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      ),
    [notes],
  );

  async function toggleExpanded(id: string) {
    const next = !expanded[id];
    setExpanded((current) => ({ ...current, [id]: next }));
    if (next && !contentById[id]) {
      await fetchNote(id);
    }
  }

  async function handleEdit(note: PatchNoteSummary) {
    if (!onRequestEdit) {
      return;
    }
    const existingContent = contentById[note.id];
    if (existingContent) {
      onRequestEdit({ ...note, content: existingContent });
      return;
    }
    const fetched = await fetchNote(note.id);
    if (fetched) {
      onRequestEdit(fetched);
    }
  }

  return (
    <div className="space-y-3">
      {orderedNotes.length === 0 ? (
        <div className="rounded-md border border-neutral-200 p-4 text-xs text-neutral-500">
          No patch notes published yet.
        </div>
      ) : null}
      {orderedNotes.map((note) => {
        const isExpanded = Boolean(expanded[note.id]);
        return (
          <div
            key={note.id}
            className="cursor-pointer rounded-md border border-neutral-200 p-4"
            role="button"
            tabIndex={0}
            onClick={() => void toggleExpanded(note.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void toggleExpanded(note.id);
              }
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-left text-sm font-medium hover:underline">
                {formatPublishedAt(note.publishedAt)}
              </div>
              {editable ? (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleEdit(note);
                    }}
                    className="rounded border border-neutral-300 px-2 py-1"
                    disabled={loadingById[note.id]}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRequestDelete?.(note);
                    }}
                    className="rounded border border-red-200 px-2 py-1 text-red-600"
                    disabled={loadingById[note.id]}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
            {isExpanded ? (
              <div className="mt-3 border-t border-neutral-200 pt-3 text-sm">
                {loadingById[note.id] ? <p className="text-xs text-neutral-500">Loading...</p> : null}
                {errorById[note.id] ? (
                  <p className="text-xs text-red-600">{errorById[note.id]}</p>
                ) : null}
                {!loadingById[note.id] && !errorById[note.id] && contentById[note.id] ? (
                  <div
                    className="text-sm"
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest("a, button")) {
                        event.stopPropagation();
                      }
                    }}
                  >
                    <PatchNoteMarkdown content={contentById[note.id]} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

