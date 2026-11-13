"use client";

/**
 * Client view of the Super Admin's data. Everything is loaded from and saved
 * to Firestore through the authenticated API — no data lives only in the
 * browser. `update()` applies an optimistic change, persists the diff, and
 * rolls back (with an error toast) if the server rejects it.
 */
import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client/api";
import type { CampaignAction, WorkspaceData, WorkspaceSummary } from "@/lib/server/repo";
import type { Contact } from "@/types/contact";
import type { Workspace, WorkspaceSettings } from "@/types/workspace";

export type WorkspaceProfile = Pick<Workspace, "name" | "industry" | "color"> & { description: string; logoUrl: string; website: string; settings: WorkspaceSettings };

export type { WorkspaceData };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Every group/tag name used by a contact must exist as a database entity. */
function syncEntities(d: WorkspaceData): WorkspaceData {
  const createdAt = new Date().toISOString();
  const missing = (known: { name: string }[], used: string[]) => [...new Set(used)].filter((n) => !known.some((k) => k.name === n));
  const newGroups = missing(d.audienceGroups, d.contacts.flatMap((c) => c.audienceGroups));
  const newTags = missing(d.tags, d.contacts.flatMap((c) => c.tags));
  if (!newGroups.length && !newTags.length) return d;
  const id = (prefix: string, name: string) => `${prefix}_${slug(name).slice(0, 40)}_${crypto.randomUUID().slice(0, 4)}`;
  return {
    ...d,
    audienceGroups: [...d.audienceGroups, ...newGroups.map((name) => ({ id: id("grp", name), name, description: "", createdAt }))],
    tags: [...d.tags, ...newTags.map((name) => ({ id: id("tag", name), name, createdAt }))],
  };
}

type Keyed = { id: string };
function diff<T extends Keyed>(prev: T[], next: T[]) {
  const before = new Map(prev.map((x) => [x.id, JSON.stringify(x)]));
  const after = new Set(next.map((x) => x.id));
  return {
    upsert: next.filter((x) => before.get(x.id) !== JSON.stringify(x)),
    delete: prev.filter((x) => !after.has(x.id)).map((x) => x.id),
  };
}

// Last selected workspace is a per-browser UI preference only.
const STORAGE_KEY = "cwh:workspace";
const EVENT = "cwh:workspace-change";
const readStoredId = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
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
  user: { email: string };
  workspaces: WorkspaceSummary[];
  workspace: Workspace;
  data: WorkspaceData;
  setWorkspaceId: (id: string) => void;
  /** Optimistically update the current workspace and persist the change. */
  update: (fn: (d: WorkspaceData) => WorkspaceData) => Promise<boolean>;
  campaignAction: (campaignId: string, action: CampaignAction) => Promise<boolean>;
  addWorkspace: (input: { name: string; industry: string }) => Promise<Workspace | null>;
  updateWorkspace: (workspaceId: string, profile: WorkspaceProfile) => Promise<boolean>;
  deleteWorkspace: (workspaceId: string, confirmName: string) => Promise<boolean>;
  saveWhatsAppConfig: (input: { businessName: string; displayName: string; phoneNumber: string; phoneNumberId: string; wabaId: string }) => Promise<boolean>;
  reload: () => Promise<void>;
};

const HubContext = React.createContext<HubContextValue | null>(null);

type Boot = { user: { email: string }; workspaces: WorkspaceSummary[] };

export function HubProvider({ children }: { children: React.ReactNode }) {
  const [boot, setBoot] = React.useState<Boot | null>(null);
  const [loaded, setLoaded] = React.useState<{ workspaceId: string; data: WorkspaceData } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const { toast, toastElement } = useToast();
  const storedId = React.useSyncExternalStore(subscribe, readStoredId, () => "");
  const workspace = boot ? (boot.workspaces.find((w) => w.id === storedId) ?? boot.workspaces[0]) : undefined;
  const workspaceId = workspace?.id;
  const current = loaded && loaded.workspaceId === workspaceId ? loaded.data : null;

  React.useEffect(() => {
    let cancelled = false;
    api<Boot>("/api/hub")
      .then((b) => !cancelled && setBoot(b))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  React.useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    api<WorkspaceData>(`/api/workspaces/${encodeURIComponent(workspaceId)}`)
      .then((data) => !cancelled && setLoaded({ workspaceId, data }))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [workspaceId, attempt]);

  const reload = React.useCallback(async () => {
    if (!workspaceId) return;
    const [b, data] = await Promise.all([api<Boot>("/api/hub"), api<WorkspaceData>(`/api/workspaces/${encodeURIComponent(workspaceId)}`)]);
    setBoot(b);
    setLoaded({ workspaceId, data });
  }, [workspaceId]);

  const setWorkspaceId = React.useCallback((id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* preference not saved — selection still applies to this tab */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const update = React.useCallback(
    async (fn: (d: WorkspaceData) => WorkspaceData) => {
      const prev = current;
      if (!prev || !workspaceId) return false;
      const next = syncEntities(fn(prev));
      const changes = {
        contacts: diff(prev.contacts, next.contacts),
        audienceGroups: diff(prev.audienceGroups, next.audienceGroups),
        tags: diff(prev.tags, next.tags),
        segments: diff(prev.segments, next.segments),
        templates: diff(prev.templates, next.templates),
        automations: diff(prev.automations, next.automations),
        campaigns: diff(prev.campaigns, next.campaigns),
      };
      setLoaded({ workspaceId, data: next });
      if (Object.values(changes).every((c) => !c.upsert.length && !c.delete.length)) return true;
      try {
        await api(`/api/workspaces/${encodeURIComponent(workspaceId)}/sync`, { method: "POST", body: changes });
        // Refresh server-computed fields (timestamps, consent history, activity).
        api<WorkspaceData>(`/api/workspaces/${encodeURIComponent(workspaceId)}`).then((data) => setLoaded((l) => (l?.workspaceId === workspaceId ? { workspaceId, data } : l))).catch(() => undefined);
        return true;
      } catch (e) {
        setLoaded({ workspaceId, data: prev });
        toast(`Not saved: ${(e as Error).message}`);
        return false;
      }
    },
    [current, workspaceId, toast],
  );

  const campaignAction = React.useCallback(
    async (campaignId: string, action: CampaignAction) => {
      if (!workspaceId) return false;
      try {
        await api(`/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}/${action}`, { method: "POST" });
        await reload();
        return true;
      } catch (e) {
        toast((e as Error).message);
        return false;
      }
    },
    [workspaceId, reload, toast],
  );

  const addWorkspace = React.useCallback(
    async (input: { name: string; industry: string }) => {
      try {
        const { workspace: created } = await api<{ workspace: Workspace }>("/api/workspaces", { method: "POST", body: input });
        setBoot(await api<Boot>("/api/hub"));
        return created;
      } catch (e) {
        toast((e as Error).message);
        return null;
      }
    },
    [toast],
  );

  const updateWorkspace = React.useCallback(
    async (id: string, profile: WorkspaceProfile) => {
      try {
        await api(`/api/workspaces/${encodeURIComponent(id)}`, { method: "PATCH", body: profile });
        setBoot(await api<Boot>("/api/hub"));
        return true;
      } catch (e) {
        toast((e as Error).message);
        return false;
      }
    },
    [toast],
  );

  const deleteWorkspace = React.useCallback(
    async (id: string, confirmName: string) => {
      try {
        await api(`/api/workspaces/${encodeURIComponent(id)}`, { method: "DELETE", body: { confirmName } });
        setBoot(await api<Boot>("/api/hub"));
        return true;
      } catch (e) {
        toast((e as Error).message);
        return false;
      }
    },
    [toast],
  );

  const saveWhatsAppConfig = React.useCallback(
    async (input: { businessName: string; displayName: string; phoneNumber: string; phoneNumberId: string; wabaId: string }) => {
      if (!workspaceId) return false;
      try {
        await api(`/api/workspaces/${encodeURIComponent(workspaceId)}/whatsapp`, { method: "PATCH", body: input });
        setBoot(await api<Boot>("/api/hub"));
        return true;
      } catch (e) {
        toast((e as Error).message);
        return false;
      }
    },
    [workspaceId, toast],
  );

  const data = current;
  const value = React.useMemo<HubContextValue | null>(
    () => (boot && workspace && data ? { user: boot.user, workspaces: boot.workspaces, workspace, data, setWorkspaceId, update, campaignAction, addWorkspace, updateWorkspace, deleteWorkspace, saveWhatsAppConfig, reload } : null),
    [boot, workspace, data, setWorkspaceId, update, campaignAction, addWorkspace, updateWorkspace, deleteWorkspace, saveWhatsAppConfig, reload],
  );

  if (error && !value) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
        <p className="font-semibold">Couldn’t load the dashboard</p>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Button size="lg" onClick={() => { setError(null); setAttempt((a) => a + 1); }}>Try again</Button>
      </div>
    );
  }
  if (boot && boot.workspaces.length === 0) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">No workspaces found.</div>;
  }
  if (!value) {
    return <DashboardSkeleton />;
  }
  return (
    <HubContext.Provider value={value}>
      {children}
      {toastElement}
    </HubContext.Provider>
  );
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
    (action) => void update((d) => ({ ...d, contacts: typeof action === "function" ? action(d.contacts) : action })),
    [update],
  );
  return [data.contacts, setContacts];
}
