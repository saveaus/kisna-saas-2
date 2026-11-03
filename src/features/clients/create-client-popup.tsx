"use client";

import { useState } from "react";
import { Calendar, MapPin, Tag, User, UserRound, Users, Wallet } from "lucide-react";
import { ChipSelect, DateChip, Popup } from "@/components/popup/popup";
import { CLASSIFICATIONS, FUNDING_TYPES, GENDERS, LEVELS, NDIS_TYPES } from "@/lib/fields";
import type { FieldValue, StaffOption } from "@/lib/records";

type Draft = Record<string, FieldValue>;

export type CreateClientInput = {
  record: Draft;
  careManagerId?: number;
  schedulerId?: number;
};

/** Create client, laid out like Lightfield's task adder. */
export function CreateClientPopup({
  open,
  onClose,
  onCreate,
  staffOptions,
}: {
  open: boolean;
  onClose: () => void;
  /** Resolves to an error message, or undefined on success. */
  onCreate: (input: CreateClientInput) => Promise<string | undefined>;
  staffOptions: StaffOption[];
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const set = (key: string) => (value: FieldValue) => setDraft((d) => ({ ...d, [key]: value }));
  const staffNames = staffOptions.map((s) => s.name);
  const idFor = (name: FieldValue) => staffOptions.find((s) => s.name === name)?.id;

  const funding = draft.fundingType as string | undefined;
  const isNdis = funding === "NDIS";
  const reset = () => {
    setName("");
    setNotes("");
    setDraft({});
    setError(undefined);
  };

  return (
    <Popup
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      icon={Users}
      label="Client"
      title={name}
      onTitleChange={setName}
      titlePlaceholder="Client name"
      description={notes}
      onDescriptionChange={setNotes}
      descriptionPlaceholder="General notes"
      submitLabel={busy ? "Creating…" : "Create client"}
      canSubmit={!busy && name.trim().length > 0 && Boolean(funding)}
      error={error}
      onSubmit={async () => {
        setBusy(true);
        const { careManager, scheduler, ...rest } = draft;
        const err = await onCreate({
          record: {
            ...rest,
            name: name.trim(),
            generalNotes: notes || undefined,
            // Funding type decides which of these applies
            ndisType: isNdis ? draft.ndisType : undefined,
            level: isNdis ? undefined : draft.level,
          },
          careManagerId: idFor(careManager),
          schedulerId: idFor(scheduler),
        });
        setBusy(false);
        if (err) setError(err);
        else reset();
      }}
      chips={
        <>
          <ChipSelect
            icon={Wallet}
            placeholder="Funding type"
            value={funding}
            options={FUNDING_TYPES}
            onChange={set("fundingType")}
          />
          {isNdis ? (
            <ChipSelect
              icon={Tag}
              placeholder="NDIS type"
              value={draft.ndisType as string | undefined}
              options={NDIS_TYPES}
              onChange={set("ndisType")}
            />
          ) : (
            <ChipSelect
              icon={Tag}
              placeholder={funding ? "Level" : "Type / level"}
              value={draft.level as string | undefined}
              options={LEVELS}
              onChange={set("level")}
              disabled={!funding || funding === "Private"}
              disabledHint={!funding ? "Choose a funding type first" : "Not used for private clients"}
            />
          )}
          <ChipSelect
            icon={MapPin}
            placeholder="Classification"
            value={draft.classification as string | undefined}
            options={CLASSIFICATIONS}
            onChange={set("classification")}
          />
          <ChipSelect
            icon={UserRound}
            placeholder="Gender"
            value={draft.gender as string | undefined}
            options={GENDERS}
            onChange={set("gender")}
          />
          <DateChip
            placeholder="Date of birth"
            value={draft.dateOfBirth as string | undefined}
            onChange={set("dateOfBirth")}
          />
          <DateChip
            placeholder="Start date"
            value={draft.startDate as string | undefined}
            onChange={set("startDate")}
          />
          <ChipSelect
            icon={User}
            placeholder="Care manager"
            value={draft.careManager as string | undefined}
            options={staffNames}
            onChange={set("careManager")}
          />
          <ChipSelect
            icon={Calendar}
            placeholder="Scheduler"
            value={draft.scheduler as string | undefined}
            options={staffNames}
            onChange={set("scheduler")}
          />
        </>
      }
    />
  );
}
