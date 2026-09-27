import { NextResponse } from "next/server";
import baselineJson from "@/data/baseline.json";
import { runScenario } from "@/lib/scenario";
import type { Baseline } from "@/lib/types";

const baseline = baselineJson as Baseline;

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const result = runScenario(
    baseline,
    body && typeof body === "object" ? (body as Record<string, unknown>) : {},
  );
  return NextResponse.json(result);
}
