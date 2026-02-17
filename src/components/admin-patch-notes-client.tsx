"use client";

import { useState } from "react";
import PatchNoteEditorModal from "@/components/patch-note-editor-modal";
import PatchNotesList, {
  type PatchNoteEntry,
  type PatchNoteSummary,
} from "@/components/patch-notes-list";

export default function AdminPatchNotesClient({
  initialNotes,
}: {
  initialNotes: PatchNoteSummary[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<PatchNoteEntry | null>(null);

  function openCreate() {
    setError(null);
    setEditingNote(null);
    setIsModalOpen(true);
  }

  function openEdit(note: PatchNoteEntry) {
    setError(null);
    setEditingNote(note);
    setIsModalOpen(true);
  }

  async function handleDelete(note: PatchNoteSummary) {
    setError(null);
    const ok = window.confirm("Delete this patch note?");
    if (!ok) {
      return;
    }

    const response = await fetch(`/api/admin/patch-notes/${note.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to delete patch note.");
      return;
    }

    setNotes((current) => current.filter((item) => item.id !== note.id));
  }

  async function handleSubmit(content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Patch note content is required.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      if (editingNote) {
        const response = await fetch(`/api/admin/patch-notes/${editingNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Unable to save patch note.");
          return;
        }
        const payload = (await response.json()) as { note: PatchNoteEntry };
        setNotes((current) =>
          current.map((item) => (item.id === payload.note.id ? payload.note : item)),
        );
      } else {
        const response = await fetch("/api/admin/patch-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Unable to publish patch note.");
          return;
        }
        const payload = (await response.json()) as { note: PatchNoteEntry };
        setNotes((current) => [payload.note, ...current]);
      }
      setIsModalOpen(false);
      setEditingNote(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="rounded bg-black px-3 py-2 text-xs text-white"
        >
          Publish new patch notes
        </button>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <PatchNotesList
        notes={notes}
        editable={true}
        onRequestEdit={openEdit}
        onRequestDelete={(note) => void handleDelete(note)}
      />

      <PatchNoteEditorModal
        open={isModalOpen}
        initialValue={editingNote?.content ?? ""}
        isSaving={isSaving}
        error={error}
        title={editingNote ? "Edit patch note" : "Publish patch note"}
        submitLabel={editingNote ? "Save changes" : "Publish"}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
          setError(null);
        }}
        onSubmit={handleSubmit}
      />
    </section>
  );
}

