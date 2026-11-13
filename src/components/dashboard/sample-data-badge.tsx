import { FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/** Marks figures that are mock/sample data, not real delivery data. */
export function SampleDataBadge({ label = "Sample data" }: { label?: string }) {
  return (
    <Badge variant="warning" title="Mock data for UI development — not real delivery data">
      <FlaskConical aria-hidden="true" />
      {label}
    </Badge>
  );
}
