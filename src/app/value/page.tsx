import type { Metadata } from "next";
import { Suspense } from "react";
import { ValueCase } from "@/components/ValueCase";
import baselineJson from "@/data/baseline.json";
import type { Baseline } from "@/lib/types";

const baseline = baselineJson as Baseline;

export const metadata: Metadata = {
  title: "Value case · Northwind Decision Room",
};

export default function ValuePage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Opening the value case…</p>}>
      <ValueCase baseline={baseline} />
    </Suspense>
  );
}
