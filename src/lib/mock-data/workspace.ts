/**
 * ⚠️ MOCK DATA — placeholder user and notifications until Firebase
 * Authentication and a notifications source are wired up.
 */

export type WorkspaceUser = {
  name: string;
  email: string;
  role: string;
};

export type WorkspaceNotification = {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  unread: boolean;
  tone: "success" | "warning" | "info";
};

/** The platform has exactly one account: the Super Admin. */
export const mockCurrentUser: WorkspaceUser = {
  name: "Channeliam Admin",
  email: "admin@channeliam.example",
  role: "Super Admin",
};

export const mockNotifications: WorkspaceNotification[] = [
  {
    id: "ntf_1",
    title: "Campaign completed",
    description: "Diwali Festive Offers reached 12,102 contacts.",
    timeLabel: "18 min ago",
    unread: true,
    tone: "success",
  },
  {
    id: "ntf_2",
    title: "Template pending review",
    description: "event_reminder_v2 is awaiting Meta approval.",
    timeLabel: "1 hr ago",
    unread: true,
    tone: "warning",
  },
  {
    id: "ntf_3",
    title: "Workspace added",
    description: "JKG workspace was created.",
    timeLabel: "Yesterday",
    unread: false,
    tone: "info",
  },
];
