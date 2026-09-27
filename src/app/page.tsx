import { Suspense } from "react";
import { DecisionRoom } from "@/components/DecisionRoom";
import baselineJson from "@/data/baseline.json";
import type { Baseline } from "@/lib/types";

const baseline = baselineJson as Baseline;

export default function Home() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Opening the room…</p>}>
      <DecisionRoom baseline={baseline} />
    </Suspense>
  );
}
