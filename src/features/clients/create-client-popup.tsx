"use client";

import { useState } from "react";
import { Calendar, Tag, User, UserRound, Users, Wallet, MapPin } from "lucide-react";
import { ChipSelect, DateChip, Popup } from "@/components/popup/popup";
import {
  CLASSIFICATIONS,
  FUNDING_TYPES,
  GENDERS,
  LEVELS,
  NDIS_TYPES,
} from "@/lib/fields";
import { staff, type ClientRecord, type FieldValue } from "@/lib/demo-data";

type Draft = Record<string, FieldValue>;

const staffNames = staff.filter((s) => s.status === "Active").map((s) => s.name);

/** Create client, laid out like Lightfield's task adder. */
export function CreateClientPopup({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (client: ClientRecord) => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<Draft>({});

  const set = (key: string) => (value: FieldValue) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const funding = draft.fundingType as string | undefined;
  const isNdis = funding === "NDIS";
  const reset = () => {
    setName("");
    setNotes("");
    setDraft({});
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
      submitLabel="Create client"
      canSubmit={name.trim().length > 0 && Boolean(funding)}
      onSubmit={() => {
        onCreate({
          id: 0,
          name: name.trim(),
          status: "Active",
          ...draft,
          generalNotes: notes || undefined,
          // Funding type decides which of these applies
          ndisType: isNdis ? draft.ndisType : undefined,
          level: isNdis ? undefined : draft.level,
        });
        reset();
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
