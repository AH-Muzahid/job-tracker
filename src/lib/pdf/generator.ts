import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { ATSResumeDocument, type ResumeDensity } from "./templates/ats-resume-template"
import type { TailoredResumeData } from "@/types/tailored-resume"

import {
  verifyPdfLayoutTree,
  type PdfLayoutReport,
  type LayoutVerifierOptions,
} from "./layout-verifier"

export interface BuildResumePdfOptions extends LayoutVerifierOptions {
  density?: ResumeDensity
}

export interface BuildResumePdfResult {
  buffer: Buffer
  layoutReport: PdfLayoutReport
  layoutTree: unknown
}

/**
 * Renders structured resume data into an ATS-friendly vector PDF Buffer
 * and verifies layout geometry directly against the Yoga layout engine.
 */
export async function buildResumePdfWithLayout(
  data: TailoredResumeData,
  options: BuildResumePdfOptions = {}
): Promise<BuildResumePdfResult> {
  let layoutTree: unknown = null
  const element = React.createElement(ATSResumeDocument, {
    data,
    density: options.density,
    onRender: (props) => {
      const internalProps = props as unknown as { _INTERNAL__LAYOUT__DATA_?: unknown }
      layoutTree = internalProps?._INTERNAL__LAYOUT__DATA_
    },
  }) as unknown as Parameters<typeof renderToBuffer>[0]

  const buffer = await renderToBuffer(element)
  const layoutReport = verifyPdfLayoutTree(layoutTree, options)

  return {
    buffer: Buffer.from(buffer),
    layoutReport,
    layoutTree,
  }
}

/**
 * Renders structured resume data into an ATS-friendly vector PDF Buffer.
 */
export async function buildResumePdfBuffer(
  data: TailoredResumeData,
  options: BuildResumePdfOptions = {}
): Promise<Buffer> {
  const result = await buildResumePdfWithLayout(data, options)
  return result.buffer
}

