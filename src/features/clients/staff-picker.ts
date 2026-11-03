import type { ClientRecord, FieldValue, StaffOption } from "@/lib/records";

/**
 * Staff pickers show names, but saving needs IDs. Two people can share a name,
 * so they get their ID in the label, and the client's current choices are
 * matched by ID rather than by name. Someone no longer offered in the list (an
 * inactive staff member) keeps their name and stays chosen.
 */
export function buildStaffPicker(client: ClientRecord, options: StaffOption[]) {
  const counts = new Map<string, number>();
  for (const s of options) counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
  const labelOf = (s: StaffOption) => ((counts.get(s.name) ?? 0) > 1 ? `${s.name} (#${s.id})` : s.name);

  const labelById = new Map(options.map((s) => [s.id, labelOf(s)]));
  const idByLabel = new Map(options.map((s) => [labelOf(s), s.id]));

  const labelsFor = (names: FieldValue, ids: FieldValue) => {
    if (!Array.isArray(names) || !Array.isArray(ids)) return undefined;
    return names.map((name, i) => {
      const id = Number(ids[i]);
      const label = labelById.get(id) ?? name;
      idByLabel.set(label, id);
      return label;
    });
  };

  const record: ClientRecord = {
    ...client,
    careManager: labelById.get(Number(client.careManagerId)) ?? client.careManager,
    scheduler: labelById.get(Number(client.schedulerId)) ?? client.scheduler,
    preferredStaff: labelsFor(client.preferredStaff, client.preferredStaffIds),
    doNotSend: labelsFor(client.doNotSend, client.doNotSendIds),
  };

  return {
    /** The client, with staff shown by the same labels the dropdown uses. */
    record,
    /** What the dropdown offers. */
    labels: options.map(labelOf),
    /** The staff ID behind a label. */
    idFor: (label: FieldValue) => (typeof label === "string" ? idByLabel.get(label) : undefined),
  };
}
