import { Metadata } from "next"
import { CareerBrainDossier } from "@/components/brain/CareerBrainDossier"

export const metadata: Metadata = {
  title: "Career Brain | Ground Truth Dossier",
  description: "Manage candidate non-negotiables, verified proof metrics, interview learning gaps, and career knowledge graph.",
}

export default function CareerBrainPage() {
  return <CareerBrainDossier />
}
