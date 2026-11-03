"use client";

import { useState } from "react";
import { Button, ConfirmDelete } from "@/components/ui/primitives";
import type { NoteItem } from "@/lib/records";
import { addClientNoteAction, deleteClientNoteAction, updateClientNoteAction } from "./actions";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[12px] text-[var(--red-ink)]">{message}</p>;
}

/** One note, read-only. Also used for the latest notes on Overview. */
export function NoteCard({
  note,
  actions,
  children,
}: {
  note: NoteItem;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="hairline rounded-[8px] bg-surface px-3 py-2.5">
      <div className="mb-1 flex min-h-6 items-center gap-2 text-[12px]">
        <span className="font-medium text-ink">{note.author}</span>
        <span className="text-ink-4">
          {note.when}
          {note.edited && " · edited"}
        </span>
        {actions && <span className="ml-auto flex items-center gap-1">{actions}</span>}
      </div>
      {children ?? <div className="text-[13px] whitespace-pre-wrap text-ink">{note.body}</div>}
    </div>
  );
}

function EditableNote({ clientId, note }: { clientId: number; note: NoteItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    setBusy(true);
    setError(undefined);
    const result = await updateClientNoteAction({ clientId, noteId: note.id, body: draft });
    setBusy(false);
    if (result.ok) setEditing(false);
    else setError(result.error);
  };

  const remove = async () => {
    setBusy(true);
    setError(undefined);
    const result = await deleteClientNoteAction({ clientId, noteId: note.id });
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  if (editing) {
    return (
      <NoteCard note={note}>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(note.body);
              setEditing(false);
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim() && !busy) save();
          }}
          rows={3}
          aria-label="Edit note"
          className="block w-full resize-y bg-transparent text-[13px] outline-none"
        />
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <span className="mr-auto">
            <ErrorText message={error} />
          </span>
          <Button
            variant="bare"
            onClick={() => {
              setDraft(note.body);
              setError(undefined);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button disabled={busy || !draft.trim()} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </NoteCard>
    );
  }

  return (
    <NoteCard
      note={note}
      actions={
        <>
          {note.canEdit && (
            <Button
              variant="bare"
              disabled={busy}
              onClick={() => {
                setDraft(note.body);
                setEditing(true);
              }}
            >
              Edit
            </Button>
          )}
          {note.canDelete && (
            <ConfirmDelete question="Delete this note?" disabled={busy} onConfirm={remove} />
          )}
        </>
      }
    >
      <div className="text-[13px] whitespace-pre-wrap text-ink">{note.body}</div>
      <ErrorText message={error} />
    </NoteCard>
  );
}

/** The draft lives with the record, so it survives switching tabs. */
export function ClientNotes({
  clientId,
  notes,
  canAdd,
  draft,
  onDraftChange,
}: {
  clientId: number;
  notes: NoteItem[];
  canAdd: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const add = async () => {
    setBusy(true);
    setError(undefined);
    const result = await addClientNoteAction({ clientId, body: draft });
    setBusy(false);
    if (result.ok) onDraftChange("");
    else setError(result.error);
  };

  return (
    <div className="flex max-w-[720px] flex-col gap-3">
      {canAdd && (
        <div className="hairline rounded-[10px] bg-surface p-2">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim() && !busy) add();
            }}
            rows={3}
            placeholder="Write a note…"
            aria-label="New note"
            className="block w-full resize-none bg-transparent px-1 text-[13px] outline-none placeholder:text-ink-5"
          />
          <div className="flex items-center justify-end gap-2">
            <span className="mr-auto px-1">
              <ErrorText message={error} />
            </span>
            <Button disabled={busy || !draft.trim()} onClick={add}>
              {busy ? "Adding…" : "Add note"}
            </Button>
          </div>
        </div>
      )}
      {notes.length === 0 && <div className="text-[13px] text-ink-5">No notes yet</div>}
      {notes.map((note) =>
        note.canEdit || note.canDelete ? (
          <EditableNote key={note.id} clientId={clientId} note={note} />
        ) : (
          <NoteCard key={note.id} note={note} />
        ),
      )}
    </div>
  );
}
