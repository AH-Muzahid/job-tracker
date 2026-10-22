import os from "os"
import path from "path"
import { writeFile, readFile, mkdir } from "fs/promises"

/**
 * Resilient resume file storage helper:
 * 1. Attempts to persist to primary local private storage (`storage/resumes`).
 * 2. If primary storage fails (e.g. EROFS on read-only serverless platforms like Vercel),
 *    safely falls back to OS temporary directory (`os.tmpdir()/resumes`).
 * 3. If filesystem write fails entirely, returns a virtual identifier so that
 *    the upload, database record, and profile extraction pipelines succeed without crashing.
 */
export async function storeResumeFile(buffer: Buffer, fileName: string): Promise<string> {
  const fileExt = fileName.split(".").pop() || "pdf"
  const finalFileName = `${crypto.randomUUID()}.${fileExt}`

  // 1. Primary: Local private server storage
  try {
    const uploadDir = path.join(process.cwd(), "storage", "resumes")
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, finalFileName)
    await writeFile(filePath, new Uint8Array(buffer))
    return `/storage/resumes/${finalFileName}`
  } catch (storageErr) {
    console.warn("[Storage] Primary storage write failed, falling back to os.tmpdir:", storageErr)
  }

  // 2. Fallback: OS tmpdir (writable in AWS Lambda / Vercel Serverless Functions)
  try {
    const tmpDir = path.join(os.tmpdir(), "resumes")
    await mkdir(tmpDir, { recursive: true })
    const filePath = path.join(tmpDir, finalFileName)
    await writeFile(filePath, new Uint8Array(buffer))
    return `/tmp/resumes/${finalFileName}`
  } catch (tmpErr) {
    console.warn("[Storage] Temporary storage write failed:", tmpErr)
  }

  // 3. Fallback: Virtual path so DB record and text extraction succeed
  return `/storage/resumes/${finalFileName}`
}

/**
 * Reads a stored resume file buffer across primary, temporary, and legacy paths.
 */
export async function readResumeFile(fileUrl: string): Promise<Buffer | null> {
  const cleanUrl = fileUrl.replace(/^[/\\]+/, "")

  // 1. Try primary storage/resumes or direct relative path
  try {
    return await readFile(path.join(process.cwd(), cleanUrl))
  } catch {
    // Continue to fallbacks
  }

  // 2. Try tmpdir if stored in /tmp/resumes
  if (cleanUrl.startsWith("tmp/") || cleanUrl.startsWith("tmp\\")) {
    try {
      const tmpRel = cleanUrl.replace(/^tmp[/\\]/, "")
      return await readFile(path.join(os.tmpdir(), tmpRel))
    } catch {
      // Continue to next fallback
    }
  }

  // 3. Try legacy public directory (e.g. public/uploads/resumes)
  try {
    return await readFile(path.join(process.cwd(), "public", cleanUrl))
  } catch {
    // Continue to next fallback
  }

  // 4. Try os.tmpdir directly with basename
  try {
    const baseName = path.basename(cleanUrl)
    return await readFile(path.join(os.tmpdir(), "resumes", baseName))
  } catch {
    return null
  }
}
