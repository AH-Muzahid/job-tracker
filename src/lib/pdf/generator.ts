/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { ATSResumeDocument } from "./templates/ats-resume-template"
import type { TailoredResumeData } from "@/types/tailored-resume"

/**
 * Renders structured resume data into an ATS-friendly vector PDF Buffer
 */
export async function buildResumePdfBuffer(data: TailoredResumeData): Promise<Buffer> {
  const element = React.createElement(ATSResumeDocument, { data }) as any
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
