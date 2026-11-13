import type { OptInStatus } from "./contact";

export type AudienceGroup = {
  id: string;
  workspaceId?: string;
  /** Unique within a workspace. Contacts reference groups by name. */
  name: string;
  description: string;
  createdAt: string;
};

export type Tag = {
  id: string;
  workspaceId?: string;
  /** Unique within a workspace. Contacts reference tags by name. */
  name: string;
  createdAt: string;
};

/** Combinable audience filter. Empty arrays / blank values mean "any". */
export type SegmentFilter = {
  groups: string[];
  groupsMatch: "any" | "all";
  tags: string[];
  tagsMatch: "any" | "all";
  optInStatuses: OptInStatus[];
  /** Only contacts that pass every campaign-eligibility rule. */
  eligibleOnly: boolean;
  addedAfter: string;
  addedBefore: string;
  customField: { key: string; value: string } | null;
};

export type Segment = {
  id: string;
  workspaceId?: string;
  name: string;
  filter: SegmentFilter;
  createdAt: string;
};

export const EMPTY_SEGMENT_FILTER: SegmentFilter = {
  groups: [], groupsMatch: "any", tags: [], tagsMatch: "any", optInStatuses: [], eligibleOnly: false, addedAfter: "", addedBefore: "", customField: null,
};
