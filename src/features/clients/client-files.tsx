"use client";

import { useRef, useState } from "react";
import { Calendar, Eye, FileText, Files, HardDrive, Upload, User } from "lucide-react";
import { DataTable, type Column } from "@/components/table/data-table";
import { Button, Chip, ConfirmDelete, EmptyState } from "@/components/ui/primitives";
import { CLIENT_FILE_ACCEPT, CLIENT_FILES_BUCKET } from "@/lib/fields";
import type { FileItem } from "@/lib/records";
import { createClient } from "@/lib/supabase/browser";
import {
  deleteClientFileAction,
  finishClientFileUploadAction,
  setClientFileSharedAction,
  startClientFileUploadAction,
} from "./actions";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Resolves to an error message, or undefined if it worked. */
async function uploadFile(clientId: number, file: File) {
  const base = { clientId, name: file.name, size: file.size };
  const start = await startClientFileUploadAction({ ...base, type: file.type });
  if (!start.ok) return start.error;

  const { error } = await createClient()
    .storage.from(CLIENT_FILES_BUCKET)
    .uploadToSignedUrl(start.path, start.token, file, { contentType: start.contentType });
  if (error) return `${start.name}: ${error.message}`;

  const finish = await finishClientFileUploadAction({
    ...base,
    name: start.name,
    type: start.contentType,
    path: start.path,
  });
  return finish.ok ? undefined : `${start.name}: ${finish.error}`;
}

function SharedChip({ shared }: { shared: boolean }) {
  return <Chip tone={shared ? "green" : "neutral"}>{shared ? "Shared" : "Private"}</Chip>;
}

function SharingControl({ clientId, file }: { clientId: number; file: FileItem }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex items-center gap-1">
      <SharedChip shared={file.shared} />
      <Button
        variant="bare"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(undefined);
          const result = await setClientFileSharedAction({
            clientId,
            fileId: file.id,
            shared: !file.shared,
          });
          setBusy(false);
          if (!result.ok) setError(result.error);
        }}
      >
        {file.shared ? "Make private" : "Share"}
      </Button>
      {error && <span className="text-[12px] text-[var(--red-ink)]">{error}</span>}
    </span>
  );
}

function DeleteFile({ clientId, fileId }: { clientId: number; fileId: number }) {
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex items-center gap-1">
      <ConfirmDelete
        question="Delete?"
        onConfirm={async () => {
          const result = await deleteClientFileAction({ clientId, fileId });
          if (!result.ok) setError(result.error);
        }}
      />
      {error && <span className="text-[12px] text-[var(--red-ink)]">{error}</span>}
    </span>
  );
}

export function ClientFiles({
  clientId,
  files,
  canEdit,
}: {
  clientId: number;
  files: FileItem[];
  canEdit: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string>();
  const [errors, setErrors] = useState<string[]>([]);

  const upload = async (chosen: File[]) => {
    setErrors([]);
    const problems: string[] = [];
    for (const file of chosen) {
      setUploading(file.name);
      const problem = await uploadFile(clientId, file);
      if (problem) problems.push(problem);
    }
    setUploading(undefined);
    setErrors(problems);
    // Lets the same file be picked again after a failure.
    if (input.current) input.current.value = "";
  };

  const columns: Column<FileItem>[] = [
    {
      key: "name",
      label: "Name",
      icon: FileText,
      width: 230,
      render: (f) => (
        <a
          href={`/clients/${clientId}/files/${f.id}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium hover:underline"
        >
          {f.name}
        </a>
      ),
    },
    {
      key: "shared",
      label: "Support workers",
      icon: Eye,
      width: 190,
      filterOptions: ["Shared", "Private"],
      value: (f) => (f.shared ? "Shared" : "Private"),
      render: (f) =>
        canEdit ? <SharingControl clientId={clientId} file={f} /> : <SharedChip shared={f.shared} />,
    },
    { key: "uploadedBy", label: "Uploaded by", icon: User, width: 130 },
    { key: "when", label: "Uploaded", icon: Calendar, width: 110 },
    {
      key: "size",
      label: "Size",
      icon: HardDrive,
      width: 90,
      defaultHidden: true,
      render: (f) => formatSize(f.size),
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            label: "Actions",
            width: 100,
            value: () => "",
            render: (f: FileItem) => <DeleteFile clientId={clientId} fileId={f.id} />,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-2">
      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            ref={input}
            type="file"
            multiple
            accept={CLIENT_FILE_ACCEPT}
            className="hidden"
            aria-label="Choose files to upload"
            onChange={(e) => {
              const chosen = [...(e.target.files ?? [])];
              if (chosen.length) upload(chosen);
            }}
          />
          <Button icon={Upload} disabled={Boolean(uploading)} onClick={() => input.current?.click()}>
            {uploading ? "Uploading…" : "Upload file"}
          </Button>
          <span className="truncate text-[12px] text-ink-4">
            {uploading ?? "PDF, photo, Word, Excel, CSV or text, up to 25 MB. Private until you share it."}
          </span>
        </div>
      )}
      {errors.map((message) => (
        <p key={message} className="text-[12px] text-[var(--red-ink)]">
          {message}
        </p>
      ))}
      {files.length === 0 ? (
        <EmptyState icon={Files} title="No files yet" body="Support workers only see files that have been shared with them." />
      ) : (
        <DataTable embedded title="Files" icon={Files} noun="file" columns={columns} rows={files} />
      )}
    </div>
  );
}
