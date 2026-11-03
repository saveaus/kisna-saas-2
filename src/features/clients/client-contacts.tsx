"use client";

import { useState } from "react";
import { Heart, Mail, Phone, StickyNote, Tag, User, Users } from "lucide-react";
import { ChipSelect, Popup, TextChip } from "@/components/popup/popup";
import { DataTable, type Column } from "@/components/table/data-table";
import { Button, Chip, ConfirmDelete, EmptyState } from "@/components/ui/primitives";
import { CONTACT_TYPES } from "@/lib/fields";
import type { ContactItem } from "@/lib/records";
import { deleteClientContactAction, saveClientContactAction } from "./actions";

/** Add or edit a contact, laid out like every other popup. */
export function ContactPopup({
  clientId,
  contact,
  onClose,
}: {
  clientId: number;
  contact?: ContactItem;
  onClose: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [contactType, setContactType] = useState<string | undefined>(contact?.contactType);
  const [relationship, setRelationship] = useState(contact?.relationship);
  const [phone, setPhone] = useState(contact?.phone);
  const [email, setEmail] = useState(contact?.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <Popup
      open
      onClose={onClose}
      icon={Users}
      label="Contact"
      title={name}
      onTitleChange={setName}
      titlePlaceholder="Contact name"
      description={notes}
      onDescriptionChange={setNotes}
      descriptionPlaceholder="Notes"
      submitLabel={busy ? "Saving…" : contact ? "Save contact" : "Add contact"}
      canSubmit={!busy && name.trim().length > 0 && Boolean(contactType)}
      error={error}
      onSubmit={async () => {
        setBusy(true);
        setError(undefined);
        const result = await saveClientContactAction({
          clientId,
          contactId: contact?.id,
          record: { name, contactType, relationship, phone, email, notes },
        });
        setBusy(false);
        if (result.ok) onClose();
        else setError(result.error);
      }}
      chips={
        <>
          <ChipSelect
            icon={Tag}
            placeholder="Type"
            value={contactType}
            options={CONTACT_TYPES}
            onChange={(value) => setContactType(value as string | undefined)}
          />
          <TextChip icon={Heart} placeholder="Relationship" value={relationship} onChange={setRelationship} />
          <TextChip icon={Phone} placeholder="Phone" type="tel" value={phone} onChange={setPhone} />
          <TextChip icon={Mail} placeholder="Email" type="email" value={email} onChange={setEmail} />
        </>
      }
    />
  );
}

function DeleteContact({ clientId, contactId }: { clientId: number; contactId: number }) {
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex items-center gap-1">
      <ConfirmDelete
        label="Remove"
        question="Remove?"
        onConfirm={async () => {
          const result = await deleteClientContactAction({ clientId, contactId });
          if (!result.ok) setError(result.error);
        }}
      />
      {error && <span className="text-[12px] text-[var(--red-ink)]">{error}</span>}
    </span>
  );
}

export function ClientContacts({
  clientId,
  contacts,
  canEdit,
  onAdd,
  onEdit,
}: {
  clientId: number;
  contacts: ContactItem[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (contact: ContactItem) => void;
}) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <EmptyState
          icon={Users}
          title="No contacts yet"
          body="Family, support coordinators and plan managers."
        />
        {canEdit && <Button onClick={onAdd}>Add contact</Button>}
      </div>
    );
  }

  const columns: Column<ContactItem>[] = [
    {
      key: "name",
      label: "Name",
      icon: User,
      width: 200,
      render: (c) =>
        canEdit ? (
          <button type="button" onClick={() => onEdit(c)} className="font-medium hover:underline">
            {c.name}
          </button>
        ) : (
          <span className="font-medium">{c.name}</span>
        ),
    },
    {
      key: "contactType",
      label: "Type",
      icon: Tag,
      width: 170,
      filterOptions: CONTACT_TYPES,
      render: (c) => <Chip>{c.contactType}</Chip>,
    },
    { key: "relationship", label: "Relationship", icon: Heart, width: 130 },
    {
      key: "phone",
      label: "Phone",
      icon: Phone,
      width: 140,
      render: (c) =>
        c.phone ? (
          <a href={`tel:${c.phone}`} className="hover:underline">
            {c.phone}
          </a>
        ) : null,
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      width: 220,
      render: (c) =>
        c.email ? (
          <a href={`mailto:${c.email}`} className="text-[var(--blue-ink)] hover:underline">
            {c.email}
          </a>
        ) : null,
    },
    { key: "notes", label: "Notes", icon: StickyNote, width: 240 },
    ...(canEdit
      ? [
          {
            key: "actions",
            label: "Actions",
            width: 150,
            value: () => "",
            render: (c: ContactItem) => <DeleteContact clientId={clientId} contactId={c.id} />,
          },
        ]
      : []),
  ];

  return (
    <DataTable
      embedded
      title="Contacts"
      icon={Users}
      noun="contact"
      columns={columns}
      rows={contacts}
      onCreate={canEdit ? onAdd : undefined}
    />
  );
}
