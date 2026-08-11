import { NextResponse } from "next/server";
import { previewJob } from "@/lib/screening/preview";

/**
 * Build call scripts for every candidate on a job.
 *
 * The UI reaches this through a server action; this route is the scriptable
 * equivalent, for seeding a demo, driving CI, or checking a deployment without
 * a browser.
 *
 * It is safe to call on a public deployment: it goes through the same CallePort
 * as everything else. It writes scripts and dials nothing — dialing is a
 * separate, per-candidate decision.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
