"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Smartphone } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { SampleDataBadge } from "@/components/dashboard/sample-data-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCampaignEligible } from "@/lib/contacts/eligibility";
import { computeFunnelMetrics } from "@/lib/funnel/metrics";
import { useHub } from "@/lib/store/hub-store";
import { formatNumber, formatPercent } from "@/lib/utils";

import { WorkspaceAvatar } from "./workspace-switcher";

const accountBadge = {
  connected: { label: "WhatsApp connected", variant: "success" },
  pending: { label: "Verification pending", variant: "warning" },
  disconnected: { label: "Not connected", variant: "neutral" },
} as const;

export function WorkspacesManager() {
  const { workspaces, workspace: current, allData, setWorkspaceId, addWorkspace } = useHub();
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [industry, setIndustry] = React.useState("");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<SampleDataBadge />}
        title="Workspaces"
        description="Each client has fully separate contacts, groups, campaigns, templates, WhatsApp account and analytics."
        actions={
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Add workspace
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((w) => {
          const d = allData[w.id];
          const metrics = computeFunnelMetrics(d.recipients);
          const badge = accountBadge[w.whatsappAccount.status];
          return (
            <Card key={w.id} className="gap-4 p-5">
              <div className="flex items-start gap-3">
                <WorkspaceAvatar workspace={w} className="size-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{w.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{w.industry}</p>
                </div>
                {w.id === current.id && <Badge variant="brand">Current</Badge>}
              </div>
              <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3 text-center">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Contacts</dt>
                  <dd className="text-base font-semibold tabular-nums">{formatNumber(d.contacts.length)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Eligible</dt>
                  <dd className="text-base font-semibold tabular-nums">{formatNumber(d.contacts.filter(isCampaignEligible).length)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Campaigns</dt>
                  <dd className="text-base font-semibold tabular-nums">{formatNumber(d.campaigns.length)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <Badge variant={badge.variant}>
                  <Smartphone aria-hidden="true" />
                  {badge.label}
                </Badge>
                <span>Read rate {formatPercent(metrics.rates.read)}</span>
              </div>
              <Button
                variant={w.id === current.id ? "outline" : "default"}
                size="lg"
                onClick={() => {
                  setWorkspaceId(w.id);
                  router.push("/");
                }}
              >
                Open workspace
                <ArrowRight aria-hidden="true" />
              </Button>
            </Card>
          );
        })}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const ws = addWorkspace({ name: name.trim(), industry: industry.trim() || "Client workspace" });
            setWorkspaceId(ws.id);
            setCreating(false);
            setName("");
            setIndustry("");
          }}
        >
          <DialogHeader title="Add workspace" description="Creates an empty, isolated workspace for a new client." onClose={() => setCreating(false)} />
          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ws-name">Client name <span className="text-primary">*</span></Label>
              <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kerala Startup Mission" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ws-industry">Industry</Label>
              <Input id="ws-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Government programme" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" size="lg" disabled={!name.trim()}>Create workspace</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
