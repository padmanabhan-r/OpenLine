import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { ingestResume, type IngestOutcome } from "@/lib/resume/ingest";

/**
 * Multipart resume upload.
 *
 * A route handler rather than a server action because actions cap request
 * bodies at 1MB by default and serialize multi-file uploads awkwardly; here
 * `formData()` just works and each file gets its own outcome in the response.
 */

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 10;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) {
    return NextResponse.json({ error: `No job ${id}` }, { status: 404 });
  }

  const form = await request.formData();
  const files = form
    .getAll("files")
    .filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files in the request." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `At most ${MAX_FILES} files per upload.` },
      { status: 400 },
    );
  }

  const outcomes: IngestOutcome[] = [];
  for (const file of files) {
    // Per-file rejection, not whole-batch failure: one oversize PDF should
    // not cost the other nine their upload.
    if (file.size > MAX_FILE_BYTES) {
      outcomes.push({
        filename: file.name,
        status: "rejected",
        reason: `Larger than ${MAX_FILE_BYTES / 1024 / 1024}MB.`,
      });
      continue;
    }
    if (file.type && file.type !== "application/pdf") {
      outcomes.push({
        filename: file.name,
        status: "rejected",
        reason: "Only PDF resumes are supported.",
      });
      continue;
    }

    // One file's unexpected failure must not cost the rest of the batch —
    // the whole design of ingest is that failures become visible outcomes.
    try {
      outcomes.push(
        await ingestResume({
          job,
          filename: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        }),
      );
    } catch (error) {
      outcomes.push({
        filename: file.name,
        status: "rejected",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ jobId: id, outcomes });
}
