/**
 * Serverless-Safe PDF Parser Engine
 *
 * Resolves breaking issues in Node < 22 and serverless (Vercel) environments:
 * 1. Polyfills `process.getBuiltinModule` (added in Node 22.3.0, missing in Node 20/18).
 * 2. Polyfills browser canvas globals (`DOMMatrix`, `ImageData`, `Path2D`) expected by pdfjs/pdf-parse.
 * 3. Uses dynamic lazy importing so routes (e.g. GET /api/resumes) never crash at module load time.
 */

export function ensurePdfPolyfills(): void {
  // Polyfill process.getBuiltinModule for Node.js < 22.3.0 (e.g. Node 20 in Vercel Serverless)
  const proc = process as unknown as { getBuiltinModule?: (name: string) => unknown }
  if (typeof proc.getBuiltinModule !== "function") {
    proc.getBuiltinModule = (name: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(name)
      } catch {
        return null
      }
    }
  }

  // Polyfill canvas global classes expected by pdfjs-dist in Node environment
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = class DOMMatrix {} as unknown as typeof globalThis.DOMMatrix
  }

  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = class ImageData {} as unknown as typeof globalThis.ImageData
  }

  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = class Path2D {} as unknown as typeof globalThis.Path2D
  }
}

/**
 * Returns the PDFParse constructor dynamically with all serverless polyfills pre-installed.
 */
export async function getSafePDFParse() {
  ensurePdfPolyfills()
  const mod = await import("pdf-parse")
  return mod.PDFParse
}

/**
 * Safely extracts text from a PDF Buffer with full serverless error resiliency.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const PDFParse = await getSafePDFParse()
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    const text = result.text || ""
    await parser.destroy()
    return text.trim()
  } catch (err) {
    console.warn("[PDF Parser] Safe extraction failed, falling back to buffer string:", err)
    return buffer.toString("utf-8")
  }
}
