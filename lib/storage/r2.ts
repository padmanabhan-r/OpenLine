import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2, holding the original resume PDFs.
 *
 * The parsed profile is a lossy reading of a document someone wrote about
 * themselves. Keeping the original means every parse can be checked against
 * what the candidate actually said — the same reason screening calls keep
 * their transcript.
 *
 * Resolved lazily, like `getDb()`: importing this module must not require R2
 * credentials, so the test suite and every non-upload path stay runnable with
 * nothing configured.
 */

let cached: S3Client | null = null;

function getR2(): S3Client {
  if (cached) return cached;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in .env — see .env.example.",
    );
  }

  cached = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cached;
}

function bucket(): string {
  const name = process.env.R2_BUCKET;
  if (!name) throw new Error("R2_BUCKET is not set.");
  return name;
}

/** Object key for an uploaded resume. Random prefix; filenames collide. */
export function resumeKey(jobId: string, filename: string): string {
  const sanitized = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `resumes/${jobId}/${crypto.randomUUID()}-${sanitized || "resume.pdf"}`;
}

export async function putResume(
  key: string,
  body: Uint8Array,
  contentType = "application/pdf",
): Promise<void> {
  await getR2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/**
 * Remove stored resumes once their rows are gone. Best effort: the rows are
 * already deleted, so a failure here leaves an orphaned file, not a broken page.
 */
export async function deleteResumes(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const results = await Promise.allSettled(
    keys.map((key) => getR2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) console.error(`[r2] ${failed} of ${keys.length} resume deletes failed`);
}

/** Public URL for a stored resume, when R2_PUBLIC_BASE_URL is configured. */
export function resumeUrl(key: string): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  return base ? `${base}/${key}` : null;
}
