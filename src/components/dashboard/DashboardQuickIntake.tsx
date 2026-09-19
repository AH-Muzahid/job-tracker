"use client";

import { UniversalJDEvaluator } from "@/components/discovery/UniversalJDEvaluator";

interface DashboardQuickIntakeProps {
  onFinished?: () => void;
  initialText?: string;
  initialUrl?: string;
}

export function DashboardQuickIntake({
  onFinished,
  initialText,
  initialUrl,
}: DashboardQuickIntakeProps) {
  return (
    <div className="w-full">
      <UniversalJDEvaluator
        onFinished={onFinished}
        initialText={initialText}
        initialUrl={initialUrl}
        embedded={false}
      />
    </div>
  );
}
