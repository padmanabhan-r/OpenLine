import { NextResponse } from "next/server";
import { liveCallsEnabled } from "@/lib/config";
import { previewJob } from "@/lib/screening/preview";

/**
 * Build call scripts for every candidate on a job.
 *
 * The UI reaches this through a server action; this route is the scriptable
 * equivalent, for seeding a demo, driving CI, or checking a deployment without
 * a browser.
 *
 * It is safe to call on a public deployment: it goes through the same CallePort
 * as everything else, so it inherits dry-run-by-default and the number
 * allowlist. In dry run it writes previews and dials nothing.
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
      mode: liveCallsEnabled() ? "live" : "dry_run",
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
