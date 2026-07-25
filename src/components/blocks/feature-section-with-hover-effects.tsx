"use client";

import React from "react";
import {
  IconLayoutKanban,
  IconBrain,
  IconFileSearch,
  IconFileText,
  IconCalendarWeek,
  IconChartBar,
  IconCloud,
  IconShieldCheck,
} from "@tabler/icons-react";

const features = [
  {
    title: "Kanban Board",
    description:
      "Drag & drop your applications through each stage — from Applied to Offer.",
    icon: IconLayoutKanban,
  },
  {
    title: "AI Interview Prep",
    description:
      "Generate tailored questions, STAR-method answers, and practice with mock interviews.",
    icon: IconBrain,
  },
  {
    title: "JD Scanner & Match",
    description:
      "Paste a job description and get instant keyword match analysis and missing skills.",
    icon: IconFileSearch,
  },
  {
    title: "Smart Resume Builder",
    description:
      "Create tailored resumes per role with AI-suggested bullet points and keywords.",
    icon: IconFileText,
  },
  {
    title: "Weekly Goals",
    description:
      "Set application targets, track outreach, and reflect with AI-powered weekly reviews.",
    icon: IconCalendarWeek,
  },
  {
    title: "Analytics Dashboard",
    description:
      "Visualize your funnel — conversion rates, response times, and source effectiveness.",
    icon: IconChartBar,
  },
  {
    title: "Cloud Sync",
    description:
      "Your data syncs seamlessly across all devices. Never lose track of an application.",
    icon: IconCloud,
  },
  {
    title: "Privacy First",
    description:
      "Your job search data stays yours. End-to-end encryption and no tracking.",
    icon: IconShieldCheck,
  },
];

export function FeaturesSectionWithHoverEffects() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

function Feature({
  title,
  description,
  icon: Icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; stroke?: number }>;
  index: number;
}) {
  const isTopRow = index < 4;
  const isLastInRow = index % 4 === 3;

  return (
    <div
      className={`
        relative group/link
        border-r border-b border-neutral-200 dark:border-neutral-800
        ${isLastInRow ? "border-r-0" : ""}
        ${index >= 4 ? "border-b-0" : ""}
        p-8
      `}
    >
      {/* Hover gradient overlay */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover/link:opacity-100
          transition-opacity duration-200
          bg-gradient-to-${isTopRow ? "t" : "b"} from-blue-500/10 to-transparent
          pointer-events-none
        `}
      />

      {/* Accent bar */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-6 group-hover/link:h-8 bg-neutral-300 dark:bg-neutral-700 group-hover/link:bg-blue-500 transition-all duration-200 rounded-r" />

      {/* Content */}
      <div className="relative z-10">
        <Icon className="text-neutral-600 dark:text-neutral-400 mb-4" stroke={1.5} />
        <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-200 group-hover/link:translate-x-1 transition-transform duration-200">
          {title}
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 mt-2 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
