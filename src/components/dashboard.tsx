"use client";

import { useState } from "react";
import { useStats } from "@/lib/api";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardKpis } from "@/components/dashboard/DashboardKpis";
import { RecommendedOpportunities } from "@/components/dashboard/RecommendedOpportunities";
import { RecentApplicationsList } from "@/components/dashboard/RecentApplicationsList";
import { UpcomingInterviewsList } from "@/components/dashboard/UpcomingInterviewsList";
import { AICareerCopilotCard } from "@/components/dashboard/AICareerCopilotCard";
import { TodayTasksCard } from "@/components/dashboard/TodayTasksCard";
import { StayConsistentCard } from "@/components/dashboard/StayConsistentCard";
import { DashboardQuickIntake } from "@/components/dashboard/DashboardQuickIntake";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function Dashboard() {
  const { data: stats, isLoading } = useStats();
  const [isQuickIntakeOpen, setIsQuickIntakeOpen] = useState(false);

  return (
    <div className="w-full max-w-full">
      {/* 2-Column Master Layout matching Reference Screenshot */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (Main Cockpit: ~73% on desktop / 8 cols) */}
        <div className="xl:col-span-8 flex flex-col space-y-5 min-w-0">
          {/* 1. Personalized Greeting & Daily Motivation Quote */}
          <DashboardHeader />

          {/* 2. Top 4 Core Career KPIs in horizontal card format */}
          <DashboardKpis data={stats?.kpi} isLoading={isLoading} />

          {/* 3. Recommended Opportunities (3 cards) */}
          <RecommendedOpportunities
            opportunities={stats?.recommendedOpportunities}
            isLoading={isLoading}
          />

          {/* 4. Side-by-side Recent Applications & Upcoming Interviews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            <RecentApplicationsList
              applications={stats?.recent || stats?.recentApplications}
              isLoading={isLoading}
            />
            <UpcomingInterviewsList
              interviews={stats?.upcomingInterviews}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Right Rail Column (~27% on desktop / 4 cols) starting at the top */}
        <div className="xl:col-span-4 flex flex-col space-y-4 min-w-0">
          {/* AI Career Copilot Card */}
          <AICareerCopilotCard onAnalyzeJD={() => setIsQuickIntakeOpen(true)} />

          {/* Today's Tasks Interactive Checklist */}
          <TodayTasksCard tasks={stats?.todayTasks} isLoading={isLoading} />

          {/* Stay Consistent Weekly Activity Streak */}
          <StayConsistentCard
            activity={stats?.weeklyActivity}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Quick Intake Modal triggered from Copilot "Analyze a job description" */}
      <Dialog open={isQuickIntakeOpen} onOpenChange={setIsQuickIntakeOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-border bg-card">
          <DialogHeader className="sr-only">
            <DialogTitle>Analyze Job Description</DialogTitle>
            <DialogDescription>
              Paste any job post to get an instant match evaluation and stage it to your pipeline.
            </DialogDescription>
          </DialogHeader>
          <DashboardQuickIntake onFinished={() => setIsQuickIntakeOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
