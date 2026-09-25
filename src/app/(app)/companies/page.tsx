"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Globe, Plus, Trash2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageContainer } from "@/components/primitives/PageContainer";
import { PageHeader } from "@/components/primitives/PageHeader";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";
import { EmptyState } from "@/components/primitives/EmptyState";

interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  _count: { applications: number };
}

export default function CompaniesPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", website: "", industry: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  function fetchCompanies() {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    fetchCompanies();
  }, [isLoaded, isSignedIn, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Company added successfully");
      setAddOpen(false);
      setForm({ name: "", website: "", industry: "", notes: "" });
      fetchCompanies();
    } else {
      toast.error("Failed to add company");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Company removed");
      fetchCompanies();
    } else {
      toast.error("Failed to remove company");
    }
  }

  if (!isLoaded || loading) {
    return (
      <PageContainer>
        <PageHeader
          title="Target Companies"
          description="Companies in your hiring pipeline"
          primaryAction={
            <Button disabled size="sm" className="rounded-sm shadow-none">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Company
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BlueprintCard key={i} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Skeleton className="size-10 rounded-sm shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32 rounded-sm" />
                    <Skeleton className="h-3 w-20 rounded-sm" />
                  </div>
                </div>
                <Skeleton className="size-7 rounded-sm" />
              </div>
              <Skeleton className="h-3.5 w-full rounded-sm pt-1" />
            </BlueprintCard>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        overline="Target Accounts"
        title="Target Companies"
        description={`${companies.length} companies tracked in your high-conviction pipeline`}
        primaryAction={
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-none cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Company
          </Button>
        }
      />

      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No target companies tracked yet"
          description="Add target employers to organize applications, track recruiter outreach, and prep company-specific notes."
          action={{
            label: "Add Your First Company",
            onClick: () => setAddOpen(true),
            icon: Plus,
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <BlueprintCard
              key={company.id}
              className="p-4 sm:p-5 flex flex-col justify-between group hover:border-foreground/25"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary font-bold text-sm">
                      {company.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {company.name}
                      </p>
                      {company.industry && (
                        <Badge
                          variant="outline"
                          className="text-[10px] mt-1 rounded-xs bg-muted text-muted-foreground border-border/80"
                        >
                          {company.industry}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(company.id)}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-7 rounded-sm transition-opacity cursor-pointer"
                    title="Delete company"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {company.notes && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed bg-muted/30 p-2.5 rounded-sm border border-border/50">
                    {company.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 tabular-nums">
                  <Briefcase className="h-3.5 w-3.5 text-primary/70" />
                  <strong className="text-foreground font-semibold">
                    {company._count.applications}
                  </strong>{" "}
                  applications
                </span>
                {company.website && (
                  <a
                    href={
                      company.website.startsWith("http")
                        ? company.website
                        : `https://${company.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                  >
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
              </div>
            </BlueprintCard>
          ))}
        </div>
      )}

      {/* Add Company Dialog - Clean Stripe 8px geometry */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-[8px] border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Add Target Company</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Google, Stripe, Vercel"
                className="rounded-sm text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://company.com"
                className="rounded-sm text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Industry</Label>
              <Input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. Fintech, AI / ML, Developer Tools"
                className="rounded-sm text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Hiring contacts, referral notes, tech stack details..."
                className="rounded-sm text-xs resize-none"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="rounded-sm text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-sm text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
              >
                {submitting ? "Adding..." : "Add Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
