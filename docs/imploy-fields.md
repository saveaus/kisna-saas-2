# Imploy fields: Clients, Sites, Staff

Captured from Imploy (app.imploy.com.au) on 3 Nov 2026, read-only, from
Settings → Objects and the record Details panels. The same definitions live
in code in `src/lib/fields.ts`; keep the two in step.

**Rule:** Imploy decides *which* fields and options exist. Lightfield decides
how they look (see `docs/design-tokens.md`).

Items marked **TODO** weren't visible in Imploy and need confirming.

---

## Clients (37 attributes)

Funding Type is required and locked; everything else is optional. Care OS also
lists Name and Status under Client Information so they can be edited there.

### Client Information
| Field | Type | Options / notes |
| --- | --- | --- |
| Email | Email | |
| Phone Number | Phone | |
| Address | Address | |
| Language | Select | e.g. English |
| Secondary Language | Multi select | |
| Gender | Select | Male, Female, Other, Non-Binary, Prefer not to say |
| Date Of Birth | Date | Shown with age, e.g. "05/05/1995 (31yo)" |
| Start Date | Date | |

### Funding Information
Fields shown depend on Funding Type.

| Field | Type | Shown for | Options / notes |
| --- | --- | --- | --- |
| Funding Type | Select, **required** | All | NDIS, HCP, Support at Home, Transitioned HCP, Grandfathered HCP, Private |
| NDIS Type | Select | NDIS | NDIS Self Managed, NDIS Agency Managed, NDIS Plan Managed, Private Client |
| Classification | Select | All | Remote, Non-Remote, Remote Aboriginal or Torres Strait Islander, Non-Remote Aboriginal or Torres Strait Islander |
| NDIS Number | Text | NDIS | |
| Level | Select | HCP / SaH | Level 1–4 seen on HCP. **TODO:** Support at Home levels |
| Referral Code | Text | HCP / SaH | |
| ACN | Text | HCP / SaH | |
| Payment Number | Text | HCP / SaH | |
| Care Recipient ID | Text | HCP / SaH | |
| Pension Status | Select | HCP / SaH | **TODO:** options |
| CRN | Text | HCP / SaH | |
| Reference | Text | All | |
| Everyday Living (%) | Number | HCP / SaH | |
| Independence (%) | Number | HCP / SaH | |
| Quotable Prices | Action | All | "Manage" button; links to price books (Phase 4) |

### Team and Preferences
| Field | Type | Notes |
| --- | --- | --- |
| Business | Relation | Which business/location the client belongs to |
| Care Manager | Relation → Staff | Shown as "Missing" on Overview when empty |
| Scheduler | Relation → Staff | Shown as "Missing" when empty |
| Preferred Staff | Relation → Staff (many) | |
| Do Not Send | Relation → Staff (many) | Staff never to roster with this client |
| Compliance | Relation | Compliance requirements for staff working with this client |
| Shift Notes Template | Select | Template workers fill in after shifts |

### Medical Information
| Field | Type | Notes |
| --- | --- | --- |
| Allergies | Multi select | Shown on Overview; drives the "participants with allergies" list |

### General Notes
| Field | Type |
| --- | --- |
| General Notes | Long text |

### Client Financial Details
| Field | Type | Shown for |
| --- | --- | --- |
| Bank Name | Text | All |
| BSB | Text | All |
| Account Number | Text | All |
| ITF Status | Select (**TODO:** options) | HCP / SaH |
| ITF Value | Text | HCP / SaH |

### Lists
| Field | Type |
| --- | --- |
| Lists | Relation (saved lists the client is in) |

### Contacts
These aren't from Imploy's field list: the brief names family, coordinators and
plan managers, and Izak confirmed the fields below on 3 Nov 2026.

| Field | Type | Options / notes |
| --- | --- | --- |
| Name | Text, **required** | |
| Type | Select, **required** | Family, Support Coordinator, Plan Manager, Other |
| Relationship | Text | e.g. Daughter |
| Phone | Phone | |
| Email | Email | |
| Notes | Long text | |

### Client table columns (Imploy default)
Client Name, ID, Type, Variant Type, DOB, Phone Number, Email Address,
Address, Gender, Start date, Reference no., Care manager, Scheduler, plus
"Add column" for any attribute.

### Client record
- Header: name, Active pill, ID, "Incomplete" flag, + Note
- Tabs: Overview, Notes, Budget, Care Plan, Observe, Tasks, Files, Contacts, Orders
- Overview highlights: Funding, Classification, Level / Type, Care Manager,
  Scheduler, Allergies; then Activity and Notes
- Budget: Billables, Budget, Recipients; line items with date, name,
  category, NDIS item code, rate, amount, paid status
- Care Plan: Upload, or build from a form
- Observe: Incidents and AI Cautions
- Side panel tabs: Details, Activity, Roster; "Request" button

---

## Sites (13 attributes)

| Field | Type | Notes |
| --- | --- | --- |
| Email | Email | |
| Phone | Phone | |
| Address | Address | |
| Site Type | Select | **TODO:** options |
| Capacity | Number | |
| Maximum Staff | Number | |
| Split Count | Number | |
| Occupancy | Number | Calculated, read-only |
| Manager | Relation → Staff | |
| Last Inspection | Date | |
| Next Inspection | Date | |
| Tags | Multi select | |
| Site Lists | Relation | |

---

## Staff (22 attributes)

### Contact & Employment
Care OS also lists Name and Status here so they can be edited.

| Field | Type | Constraint | Options / notes |
| --- | --- | --- | --- |
| Staff Name | Text | Required, locked | |
| Employee ID | Text | Unique, locked | Auto-assigned, e.g. 1303 |
| Email | Email | Required, locked | |
| Phone | Phone | Required, locked | |
| Address | Address | Required, locked | |
| Role | Select | Required, locked | Superadmin, Service Manager, Scheduler, Service Delivery Worker |
| Type (Employment Type) | Select | Required, locked | Employee, Contractor |
| Access Business | Relation | Required, locked | |

### Basic Information
| Field | Type | Constraint |
| --- | --- | --- |
| Preferred Name | Text | |
| Gender | Select | Same options as clients |
| Nationality | Multi select | |
| Date Of Birth | Date | Required |
| Age | Number | Calculated |

### Emergency Contact
Name, Relationship (text), Primary Phone, Alt Phone (phone), Email, Address.

### Account Information
| Field | Type |
| --- | --- |
| ABN | Text |
| Trading Name | Text |
| Pay group (Xero Payroll) | Relation |

### Employment tab
Taxfile Number, Employing Entity, Location, Primary Cost Centre, Additional
Cost Centres, Employment Type, Contract Type, Job Title, Base Pay Rate,
Actual Weekly Hours/Days, Full-Time Equivalent Weekly Hours/Days, Maximum
Daily Hours (default 10).

### Staff document types (Settings → Objects → Staff → Documents)
All single file uploads: Certificate III in Aged Care / Community Care,
Comprehensive Vehicle Insurance, CPR Certificate, Drivers License,
Employment Contract, First Aid Certificate, Identification, Infection
Control Certificate, Manual Handling Certificate, Medication Training
Certificate, NDIS Clearance Check, Police Clearance, Profile Picture,
RRHAN-EC Certificate, Safe Environments Training, Vehicle Registration,
Working With Children Check.

### Staff table columns (Imploy default)
Staff Name, ID, Role, Gender, Nationality, Type, Email, Phone Number, Date
of Birth, Age, Pending Leave, Checklist, Associated business, Status.

### Staff record
- Tabs: Overview, Notes, Compliance, Files, Leave, Availability,
  Employment, Finance, Activity
- Overview highlights: Role, Nationality, Type, Employee ID, Date of
  Birth, Access Business
- List views: Staff, Leave Requests, Availability

---

## Roles and permissions (for Step 2)

Imploy roles: Superadmin (always full access), Service Manager, Scheduler,
Service Delivery Worker. Each role has "Web app access?" and, per area, No
access / Read only / Full access. Areas: Staff Availability & Leave, Clients
& Sites, Forms, Finance Claims & Invoicing, Finance Claims, Finance
Contacts, Manage Users, Scheduler, Company Documents, Suppliers, Chat,
Incidents, Reports, Tasks, Contacts, Prospects, Settings, Procurements.

## Demo records in Imploy

- Clients: Demo HCP Client (ID 1, HCP, Level 1, Remote) and Demo NDIS
  Client (ID 2, NDIS Self Managed, Remote, NDIS123456, REF123456)
- Staff: Demo Service Manager (1303) and Demo Scheduler (1304), both
  Employee, DOB 01/01/1990
