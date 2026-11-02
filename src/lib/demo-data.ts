/**
 * Demo data for Phase 1, Step 1. Nothing here is saved; Steps 2–4 move
 * Clients, Sites and Staff into Supabase. All people are fictional.
 */

export type FieldValue = string | number | string[] | undefined;

export type ClientRecord = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  [key: string]: FieldValue;
};

export type StaffRecord = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  [key: string]: FieldValue;
};

export type SiteRecord = {
  id: number;
  name: string;
  [key: string]: FieldValue;
};

export type ActivityItem = { what: string; who: string; when: string };
export type NoteItem = { author: string; body: string; when: string };

export const staff: StaffRecord[] = [
  {
    id: 1302,
    name: "Alex Morgan",
    status: "Active",
    role: "Superadmin",
    employmentType: "Employee",
    email: "alex.morgan@example.com",
    phone: "0400 000 101",
    address: "12 River St, Brisbane QLD",
    gender: "Female",
    nationality: ["Australian"],
    dateOfBirth: "1988-04-12",
    age: 38,
    accessBusiness: "Demo Provider",
    pendingLeave: 0,
    checklist: "12/12",
  },
  {
    id: 1303,
    name: "Demo Service Manager",
    status: "Active",
    role: "Service Manager",
    employmentType: "Employee",
    email: "service.manager@example.com",
    phone: "0400 000 102",
    address: "123 Demo Street, Demo City",
    gender: "Other",
    dateOfBirth: "1990-01-01",
    age: 36,
    accessBusiness: "Demo Provider",
    pendingLeave: 0,
    checklist: "10/12",
  },
  {
    id: 1304,
    name: "Demo Scheduler",
    status: "Active",
    role: "Scheduler",
    employmentType: "Employee",
    email: "scheduler@example.com",
    phone: "0400 000 103",
    address: "123 Demo Street, Demo City",
    gender: "Other",
    dateOfBirth: "1990-01-01",
    age: 36,
    accessBusiness: "Demo Provider",
    pendingLeave: 1,
    checklist: "9/12",
  },
  {
    id: 1305,
    name: "Jordan Hale",
    status: "Active",
    role: "Service Delivery Worker",
    employmentType: "Contractor",
    email: "jordan.hale@example.com",
    phone: "0400 000 104",
    address: "8 Hill Rd, Ipswich QLD",
    gender: "Male",
    nationality: ["Australian", "New Zealander"],
    dateOfBirth: "1995-09-30",
    age: 31,
    accessBusiness: "Demo Provider",
    abn: "51 824 753 556",
    pendingLeave: 0,
    checklist: "7/12",
  },
  {
    id: 1306,
    name: "Priya Nair",
    status: "Active",
    role: "Service Delivery Worker",
    employmentType: "Employee",
    email: "priya.nair@example.com",
    phone: "0400 000 105",
    address: "41 Coast Rd, Redcliffe QLD",
    gender: "Female",
    nationality: ["Indian"],
    dateOfBirth: "1992-06-18",
    age: 34,
    accessBusiness: "Demo Provider",
    pendingLeave: 2,
    checklist: "12/12",
  },
  {
    id: 1307,
    name: "Riley Brooks",
    status: "Inactive",
    role: "Service Delivery Worker",
    employmentType: "Employee",
    email: "riley.brooks@example.com",
    phone: "0400 000 106",
    gender: "Non-Binary",
    dateOfBirth: "1999-02-02",
    age: 27,
    accessBusiness: "Demo Provider",
    pendingLeave: 0,
    checklist: "3/12",
  },
];

export const clients: ClientRecord[] = [
  {
    id: 1,
    name: "Demo HCP Client",
    status: "Active",
    fundingType: "HCP",
    level: "Level 1",
    classification: "Remote",
    dateOfBirth: "1990-01-01",
    address: "123 Demo Street, Demo City",
    gender: "Other",
    language: "English",
    acn: "123456789",
    careManager: "Alex Morgan",
    preferredStaff: "Alex Morgan",
    business: "Demo Provider",
  },
  {
    id: 2,
    name: "Demo NDIS Client",
    status: "Active",
    fundingType: "NDIS",
    ndisType: "NDIS Self Managed",
    classification: "Remote",
    ndisNumber: "NDIS123456",
    reference: "REF123456",
    dateOfBirth: "1995-05-05",
    address: "123 Demo Street, Demo City",
    gender: "Other",
    language: "English",
    business: "Demo Provider",
  },
  {
    id: 3,
    name: "Amira Hassan",
    status: "Active",
    fundingType: "NDIS",
    ndisType: "NDIS Plan Managed",
    classification: "Non-Remote",
    ndisNumber: "430182746",
    email: "amira.h@example.com",
    phone: "0411 222 333",
    dateOfBirth: "1984-11-20",
    startDate: "2025-03-01",
    address: "5 Wattle Ave, Logan QLD",
    gender: "Female",
    language: "Arabic",
    secondaryLanguages: ["English"],
    allergies: ["Peanuts"],
    careManager: "Demo Service Manager",
    scheduler: "Demo Scheduler",
    business: "Demo Provider",
  },
  {
    id: 4,
    name: "Noah Bennett",
    status: "Active",
    fundingType: "Support at Home",
    level: "Level 3",
    classification: "Non-Remote",
    email: "noah.b@example.com",
    phone: "0411 444 555",
    dateOfBirth: "1946-07-14",
    startDate: "2025-11-01",
    address: "22 Jacaranda St, Toowoomba QLD",
    gender: "Male",
    language: "English",
    careManager: "Demo Service Manager",
    scheduler: "Demo Scheduler",
    business: "Demo Provider",
  },
  {
    id: 5,
    name: "Sofia Rahman",
    status: "Active",
    fundingType: "NDIS",
    ndisType: "NDIS Agency Managed",
    classification: "Non-Remote",
    ndisNumber: "783125406",
    dateOfBirth: "2001-03-09",
    address: "9 Ocean Pde, Gold Coast QLD",
    gender: "Female",
    language: "English",
    allergies: ["Penicillin", "Latex"],
    careManager: "Alex Morgan",
    business: "Demo Provider",
  },
  {
    id: 6,
    name: "Leo Park",
    status: "Inactive",
    fundingType: "Private",
    classification: "Non-Remote",
    dateOfBirth: "1978-12-01",
    address: "3 Fig Tree Ln, Brisbane QLD",
    gender: "Prefer not to say",
    language: "Korean",
    business: "Demo Provider",
  },
];

export const sites: SiteRecord[] = [
  {
    id: 1,
    name: "Wattle House",
    siteType: "Supported Independent Living",
    address: "14 Wattle Ave, Logan QLD",
    capacity: 4,
    maximumStaff: 2,
    occupancy: 3,
    manager: "Demo Service Manager",
    nextInspection: "2026-12-04",
  },
  {
    id: 2,
    name: "Bayside Respite",
    siteType: "Short Term Accommodation",
    address: "77 Esplanade, Wynnum QLD",
    capacity: 6,
    maximumStaff: 3,
    occupancy: 2,
    manager: "Alex Morgan",
    nextInspection: "2027-01-20",
  },
];

export const clientActivity: Record<number, ActivityItem[]> = {
  1: [
    { what: "Care Plan Created", who: "Alex Morgan", when: "5 months ago" },
    { what: "Client Data Updated", who: "Alex Morgan", when: "5 months ago" },
  ],
  2: [{ what: "Budget Created", who: "Alex Morgan", when: "5 months ago" }],
};

export const clientNotes: Record<number, NoteItem[]> = {
  1: [
    {
      author: "Alex Morgan",
      body: "Prefers morning visits. Call the day before to confirm.",
      when: "4 months ago",
    },
  ],
};

export function findClient(id: number) {
  return clients.find((c) => c.id === id);
}

export function findStaff(id: number) {
  return staff.find((s) => s.id === id);
}
