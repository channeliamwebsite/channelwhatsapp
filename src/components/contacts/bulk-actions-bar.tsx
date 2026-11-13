"use client";

import { CircleSlash, Download, FolderMinus, FolderPlus, Megaphone, Tag, Trash2, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownTrigger } from "@/components/ui/dropdown";
import { cn, formatNumber } from "@/lib/utils";

type BulkActionsBarProps = {
  count: number;
  totalMatching: number;
  allMatchingSelected: boolean;
  onSelectAllMatching: () => void;
  onClear: () => void;
  groups: string[];
  tags: string[];
  onAddToGroup: (group: string) => void;
  onRemoveFromGroup: (group: string) => void;
  onAddTag: (tag: string) => void;
  onPrepareCampaign: () => void;
  onOptOut: () => void;
  onExport: (format: "csv" | "xlsx") => void;
  onDelete: () => void;
};

const trigger = cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-card");

export function BulkActionsBar(props: BulkActionsBarProps) {
  const { count, totalMatching, allMatchingSelected } = props;
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-accent/50 px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-foreground">{formatNumber(count)} selected</span>
        {!allMatchingSelected && totalMatching > count && (
          <button type="button" onClick={props.onSelectAllMatching} className="font-medium text-primary hover:underline">
            Select all {formatNumber(totalMatching)} matching
          </button>
        )}
        <button type="button" onClick={props.onClear} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <X className="size-3.5" aria-hidden="true" />
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={props.onPrepareCampaign}>
          <Megaphone aria-hidden="true" />
          Use in campaign
        </Button>
        <Dropdown>
          <DropdownTrigger className={trigger}>
            <FolderPlus aria-hidden="true" />
            Add to group
          </DropdownTrigger>
          <DropdownContent align="start">
            <DropdownLabel>Audience groups</DropdownLabel>
            {props.groups.map((g) => (
              <DropdownItem key={g} onClick={() => props.onAddToGroup(g)}>{g}</DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
        <Dropdown>
          <DropdownTrigger className={trigger}>
            <FolderMinus aria-hidden="true" />
            Remove from group
          </DropdownTrigger>
          <DropdownContent align="start">
            <DropdownLabel>Audience groups</DropdownLabel>
            {props.groups.map((g) => (
              <DropdownItem key={g} onClick={() => props.onRemoveFromGroup(g)}>{g}</DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
        <Dropdown>
          <DropdownTrigger className={trigger}>
            <Tag aria-hidden="true" />
            Add tag
          </DropdownTrigger>
          <DropdownContent align="start">
            <DropdownLabel>Tags</DropdownLabel>
            {props.tags.map((t) => (
              <DropdownItem key={t} onClick={() => props.onAddTag(t)}>{t}</DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
        <Dropdown>
          <DropdownTrigger className={trigger}>
            <Download aria-hidden="true" />
            Export
          </DropdownTrigger>
          <DropdownContent align="start" className="min-w-40">
            <DropdownItem onClick={() => props.onExport("csv")}>CSV (.csv)</DropdownItem>
            <DropdownItem onClick={() => props.onExport("xlsx")}>Excel (.xlsx)</DropdownItem>
          </DropdownContent>
        </Dropdown>
        <Button variant="outline" size="lg" className="bg-card" onClick={props.onOptOut}>
          <CircleSlash aria-hidden="true" />
          Mark opted out
        </Button>
        <Button variant="destructive" size="lg" onClick={props.onDelete}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </div>
    </div>
  );
}
