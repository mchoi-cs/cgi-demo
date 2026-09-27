import type { Metadata } from "next";
import { SlideDeck } from "@/components/SlideDeck";
import baselineJson from "@/data/baseline.json";
import {
  defaultLevers,
  leversToSearchParams,
  recommendedLevers,
} from "@/lib/levers";
import { runScenario } from "@/lib/scenario";
import type { Baseline } from "@/lib/types";

const baseline = baselineJson as Baseline;

export const metadata: Metadata = {
  title: "Slides · Northwind Decision Room",
  description:
    "Executive committee deck. The twelve-month score target is an integration problem.",
};

export default function SlidesPage() {
  const recommended = recommendedLevers(baseline);
  const params = leversToSearchParams(recommended).toString();

  return (
    <SlideDeck
      baseline={baseline}
      clientAsk={runScenario(baseline, defaultLevers(baseline))}
      recommendedPath={runScenario(baseline, recommended)}
      demoHref={`/?${params}`}
      valueHref={`/value?${params}`}
    />
  );
}
