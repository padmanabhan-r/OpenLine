import { extractText } from "unpdf";

/**
 * PDF → plain text.
 *
 * `unpdf` runs in a plain Node process with no native dependencies, and fails
 * the way we want: a scanned/image-only PDF comes back as (near-)empty text
 * instead of hallucination fuel. The caller treats "too little text" as a
 * visible parse failure.
 */

/** Below this many characters, the file is presumed unreadable as text. */
export const MIN_RESUME_TEXT_CHARS = 200;

export async function extractResumeText(bytes: Uint8Array): Promise<string> {
  const { text } = await extractText(bytes, { mergePages: true });
  return text.trim();
}
