import {
  BarChart3,
  Contact,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Settings,
  Smartphone,
  Building2,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Overview", href: "/", icon: LayoutDashboard, description: "Messaging performance at a glance." },
      { title: "Conversations", href: "/conversations", icon: MessagesSquare, description: "Reply to customers from a shared inbox." },
      { title: "Campaigns", href: "/campaigns", icon: Megaphone, description: "Plan, send and track broadcast campaigns." },
    ],
  },
  {
    label: "Audience",
    items: [
      { title: "Contacts", href: "/contacts", icon: Contact, description: "Manage contacts and opt-in status." },
      { title: "Audience Groups", href: "/audience-groups", icon: UsersRound, description: "Segment contacts into reusable groups." },
    ],
  },
  {
    label: "Messaging",
    items: [
      { title: "Templates", href: "/templates", icon: FileText, description: "Create and manage approved message templates." },
      { title: "Funnels", href: "/automation", icon: Workflow, description: "Three-message behaviour funnels across campaigns." },
      { title: "Reports", href: "/reports", icon: BarChart3, description: "Delivery, engagement and team reports." },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Workspaces", href: "/workspaces", icon: Building2, description: "Manage client workspaces." },
      { title: "WhatsApp Account", href: "/whatsapp-account", icon: Smartphone, description: "Business number, profile and connection." },
      { title: "Settings", href: "/settings", icon: Settings, description: "Workspace preferences and integrations." },
    ],
  },
];

export const navItems: NavItem[] = navSections.flatMap((section) => section.items);

/** Whether `href` should be highlighted for the current `pathname`. */
export function isNavItemActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavItem(href: string): NavItem {
  const item = navItems.find((entry) => entry.href === href);
  if (!item) throw new Error(`Unknown navigation item: ${href}`);
  return item;
}
