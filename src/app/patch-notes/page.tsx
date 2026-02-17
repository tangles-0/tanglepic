import { getSessionUserId } from "@/lib/auth";
import TextLink from "@/components/ui/text-link";
import PatchNotesList from "@/components/patch-notes-list";
import {
  getLatestPatchNote,
  listPatchNotes,
  setUserLastPatchNoteDismissed,
} from "@/lib/metadata-store";

export default async function PatchNotesPage() {
  const userId = await getSessionUserId();
  const [notes, latestNote] = await Promise.all([listPatchNotes(), getLatestPatchNote()]);

  if (userId && latestNote) {
    await setUserLastPatchNoteDismissed(userId, new Date(latestNote.publishedAt));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-2">
        <TextLink href="/" className="text-sm">
          Back home
        </TextLink>
        <h1 className="text-2xl font-semibold">Patch notes</h1>
        <p className="text-neutral-600">Latest updates, newest first.</p>
      </header>
      <PatchNotesList notes={notes} />
    </main>
  );
}

