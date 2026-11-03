import {
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  Clock,
  FileText,
  FolderOpen,
  FormInput,
  Gauge,
  Inbox,
  ListChecks,
  MapPin,
  MessageCircle,
  Repeat,
  ScrollText,
  ShieldCheck,
  Siren,
  Sparkles,
  SquareCheck,
  Truck,
  User,
  Users,
  Wallet,
  Activity,
  type LucideIcon,
} from "lucide-react";

/**
 * Sidebar structure. Grouped the way Imploy groups its sections, in Lightfield's
 * style, and kept short: what people use all day sits at the top, everything
 * else is folded away. Move a group's defaultOpen to true when it has pages in
 * daily use. Items without an href are placeholders; `phase` says when they arrive.
 */
export type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  phase?: number;
};

export type NavGroup = {
  /** Groups with a label fold away. The one without is always open. */
  label?: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

export const NAV: NavGroup[] = [
  {
    items: [
      { label: "Up next", icon: Clock, href: "/" },
      { label: "Tasks", icon: SquareCheck, phase: 6 },
      { label: "Roster", icon: CalendarDays, phase: 2 },
      { label: "Clients", icon: Users, href: "/clients" },
      { label: "Sites", icon: MapPin, href: "/sites" },
      { label: "Staff", icon: User, href: "/staff" },
    ],
  },
  {
    label: "Operations",
    defaultOpen: false,
    items: [
      { label: "Incidents", icon: Siren, phase: 3 },
      { label: "Documents", icon: FolderOpen, phase: 6 },
      { label: "Forms", icon: FormInput, phase: 6 },
      { label: "Follow-ups", icon: Repeat, phase: 3 },
    ],
  },
  {
    label: "Business",
    defaultOpen: false,
    items: [
      { label: "Finance", icon: Wallet, phase: 4 },
      { label: "Reports", icon: ChartColumn, phase: 6 },
      { label: "Prospects", icon: Inbox, phase: 6 },
      { label: "Suppliers", icon: Truck, phase: 6 },
    ],
  },
  {
    label: "Compliance",
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
  {
    label: "Assistant",
    defaultOpen: false,
    items: [
      { label: "Chats", icon: MessageCircle, phase: 5 },
      { label: "Skills", icon: Sparkles, phase: 5 },
    ],
  },
];
