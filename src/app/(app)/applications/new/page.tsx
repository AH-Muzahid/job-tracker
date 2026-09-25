import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import ApplicationForm from "@/components/ApplicationForm"

export default function NewApplicationPage() {
  return (
    <PageContainer>
      <PageHeader
        overline="Intake Studio"
        title="Add Application"
        description="Track a new job opportunity and stage your custom application materials"
        primaryAction={
          <Button asChild variant="outline" size="sm" className="rounded-[4px] h-8 text-xs font-medium">
            <Link href="/applications">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Pipeline
            </Link>
          </Button>
        }
      />
      <div className="border border-border bg-card rounded-[6px] p-6 max-w-2xl">
        <ApplicationForm />
      </div>
    </PageContainer>
  )
}
