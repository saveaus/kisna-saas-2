import {
  BookOpen,
  Box,
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  Clock,
  FileText,
  FormInput,
  Gauge,
  Inbox,
  ListChecks,
  MapPin,
  Repeat,
  ScrollText,
  ShieldCheck,
  Siren,
  SquareCheck,
  StickyNote,
  Truck,
  User,
  Users,
  Wallet,
  Activity,
  type LucideIcon,
} from "lucide-react";

/**
 * Sidebar structure, following Lightfield's layout (brief → App structure).
 * Items without an href are placeholders; `phase` says when they arrive.
 */
export type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  phase?: number;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export const NAV: NavGroup[] = [
  {
    items: [
      { label: "Up next", icon: Clock, href: "/" },
      { label: "Knowledge", icon: BookOpen, phase: 5 },
      { label: "Skills", icon: Box, phase: 5 },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Clients", icon: Users, href: "/clients" },
      { label: "Sites", icon: MapPin, href: "/sites" },
      { label: "Staff", icon: User, href: "/staff" },
      { label: "Prospects", icon: Inbox, phase: 6 },
      { label: "Suppliers", icon: Truck, phase: 6 },
      { label: "Incidents", icon: Siren, phase: 3 },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Roster", icon: CalendarDays, phase: 2 },
      { label: "Tasks", icon: SquareCheck, phase: 6 },
      { label: "Notes", icon: StickyNote, phase: 6 },
      { label: "Follow-ups", icon: Repeat, phase: 3 },
      { label: "Forms", icon: FormInput, phase: 6 },
      { label: "Reports", icon: ChartColumn, phase: 6 },
      { label: "Finance", icon: Wallet, phase: 4 },
    ],
  },
  {
    label: "Compliance",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Overview", icon: Gauge, phase: 3 },
      { label: "Approvals", icon: ClipboardCheck, phase: 3 },
      { label: "Policies", icon: ScrollText, phase: 3 },
      { label: "Registers", icon: ListChecks, phase: 3 },
      { label: "Audits", icon: ShieldCheck, phase: 3 },
      { label: "Evidence", icon: FileText, phase: 3 },
      { label: "Activity", icon: Activity, phase: 3 },
    ],
  },
];

export { Building2 as BusinessIcon };
