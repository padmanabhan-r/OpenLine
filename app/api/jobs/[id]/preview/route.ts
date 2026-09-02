import { NextResponse } from "next/server";
import { previewJob } from "@/lib/screening/preview";
import { operatorStatus } from "@/lib/operator";

/**
 * Build call scripts for every candidate on a job.
 *
 * The UI reaches this through a server action; this route is the scriptable
 * equivalent, for seeding a demo, driving CI, or checking a deployment without
 * a browser.
 *
 * It writes scripts and dials nothing — dialing is a separate, per-candidate
 * decision. It still asks who is calling: on a locked deployment, send the
 * operator token as `x-openline-operator`.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const operator = await operatorStatus();
  if (!operator.ok) {
    return NextResponse.json({ error: operator.reason }, { status: 401 });
  }

  try {
    const outcomes = await previewJob(id);
    return NextResponse.json({
      jobId: id,
      previewed: outcomes.filter((o) => o.status === "previewed").length,
      refused: outcomes.filter((o) => o.status === "refused").length,
      skipped: outcomes.filter((o) => o.status === "skipped").length,
      outcomes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preview failed." },
      { status: 500 },
    );
  }
}
