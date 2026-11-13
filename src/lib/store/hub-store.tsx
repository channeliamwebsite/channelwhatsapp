"use client";

/**
 * Client-side store for the mock phase. Holds every workspace's data in memory
 * (resets on reload). Shapes mirror the planned Firestore layout:
 *   workspaces/{workspaceId}/contacts|audienceGroups|campaigns|recipients/{id}
 */
import * as React from "react";

import { seedCampaignRecipients } from "@/lib/funnel/simulate";
import { mockCampaignsFor } from "@/lib/mock-data/campaigns";
import { mockContactsFor } from "@/lib/mock-data/contacts";
import { mockTemplatesFor } from "@/lib/mock-data/templates";
import { DEFAULT_WORKSPACE_ID, WORKSPACE_SEEDS } from "@/lib/mock-data/workspaces";
import type { AudienceGroup } from "@/types/audience";
import type { Campaign } from "@/types/campaign";
import type { Contact } from "@/types/contact";
import type { RecipientProgress } from "@/types/funnel";
import type { WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

export type WorkspaceData = {
  contacts: Contact[];
  audienceGroups: AudienceGroup[];
  campaigns: Campaign[];
  recipients: RecipientProgress[];
  templates: WhatsAppTemplate[];
};

type HubState = { workspaces: Workspace[]; data: Record<string, WorkspaceData> };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Every group name used by a contact must exist as a group entity. */
function syncGroups(d: WorkspaceData, createdAt: string): WorkspaceData {
  const known = new Set(d.audienceGroups.map((g) => g.name));
  const missing = [...new Set(d.contacts.flatMap((c) => c.audienceGroups))].filter((n) => !known.has(n));
  if (!missing.length) return d;
  return {
    ...d,
    audienceGroups: [...d.audienceGroups, ...missing.map((name) => ({ id: `grp_${slug(name)}`, name, description: "", createdAt }))],
  };
}

function buildInitialState(): HubState {
  const data: Record<string, WorkspaceData> = {};
  for (const seed of WORKSPACE_SEEDS) {
    const id = seed.workspace.id;
    const contacts = mockContactsFor(id, {
      count: seed.contactCount,
      groups: seed.groups.map((g) => g.name),
      tags: seed.tags,
      organisations: seed.organisations,
    });
    const templates = mockTemplatesFor(id, seed.templatePrefix, seed.workspace.name);
    const campaignSeeds = mockCampaignsFor(id);
    let ws: WorkspaceData = {
      contacts,
      templates,
      audienceGroups: seed.groups.map((g) => ({ id: `grp_${slug(g.name)}`, name: g.name, description: g.description, createdAt: seed.workspace.createdAt })),
      campaigns: [],
      recipients: [],
    };
    for (const { campaign, stages } of campaignSeeds) ws = seedCampaignRecipients(ws, campaign, stages);
    data[id] = syncGroups(ws, seed.workspace.createdAt);
  }
  return { workspaces: WORKSPACE_SEEDS.map((s) => s.workspace), data };
}

// ---- current workspace (persisted per browser) ----------------------------
const STORAGE_KEY = "cwh:workspace";
const EVENT = "cwh:workspace-change";
const readWorkspaceId = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_WORKSPACE_ID;
  } catch {
    return DEFAULT_WORKSPACE_ID;
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};

type HubContextValue = {
  workspaces: Workspace[];
  workspace: Workspace;
  data: WorkspaceData;
  allData: Record<string, WorkspaceData>;
  setWorkspaceId: (id: string) => void;
  /** Update the current workspace's data. */
  update: (fn: (d: WorkspaceData) => WorkspaceData) => void;
  addWorkspace: (input: { name: string; industry: string }) => Workspace;
};

const HubContext = React.createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState(buildInitialState);
  const storedId = React.useSyncExternalStore(subscribe, readWorkspaceId, () => DEFAULT_WORKSPACE_ID);
  const workspace = state.workspaces.find((w) => w.id === storedId) ?? state.workspaces[0];

  const setWorkspaceId = React.useCallback((id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable — selection lasts for this page only */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const workspaceId = workspace.id;
  const update = React.useCallback(
    (fn: (d: WorkspaceData) => WorkspaceData) =>
      setState((s) => ({ ...s, data: { ...s.data, [workspaceId]: syncGroups(fn(s.data[workspaceId]), new Date().toISOString()) } })),
    [workspaceId],
  );

  const addWorkspace = React.useCallback((input: { name: string; industry: string }) => {
    const base = slug(input.name) || "workspace";
    const id = `${base}-${crypto.randomUUID().slice(0, 4)}`;
    const ws: Workspace = {
      id,
      name: input.name,
      initials: input.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      industry: input.industry,
      color: "#6f6466",
      createdAt: new Date().toISOString(),
      whatsappAccount: { id: `waba_${id}`, displayName: input.name, phoneNumber: "Not connected", status: "disconnected", qualityRating: "high", messagingLimit: "—" },
    };
    setState((s) => ({
      workspaces: [...s.workspaces, ws],
      data: { ...s.data, [id]: { contacts: [], audienceGroups: [], campaigns: [], recipients: [], templates: mockTemplatesFor(id, base.replace(/-/g, ""), input.name) } },
    }));
    return ws;
  }, []);

  const value = React.useMemo<HubContextValue>(
    () => ({ workspaces: state.workspaces, workspace, data: state.data[workspace.id], allData: state.data, setWorkspaceId, update, addWorkspace }),
    [state, workspace, setWorkspaceId, update, addWorkspace],
  );

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub() {
  const ctx = React.useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used inside <HubProvider>.");
  return ctx;
}

/** `[contacts, setContacts]` for the current workspace — same shape as useState. */
export function useWorkspaceContacts(): [Contact[], React.Dispatch<React.SetStateAction<Contact[]>>] {
  const { data, update } = useHub();
  const setContacts = React.useCallback<React.Dispatch<React.SetStateAction<Contact[]>>>(
    (action) => update((d) => ({ ...d, contacts: typeof action === "function" ? action(d.contacts) : action })),
    [update],
  );
  return [data.contacts, setContacts];
}
