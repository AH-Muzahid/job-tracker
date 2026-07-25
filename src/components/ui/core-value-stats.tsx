"use client";

import React from "react";
import { motion } from "framer-motion";

export interface CoreStat {
  value: string;
  label: string;
  description: string;
  image?: string;
}

interface CoreValueStatsProps {
  stats: CoreStat[];
}

function StatCard({
  stat,
  index,
}: {
  stat: CoreStat;
  index: number;
}) {
  const hasImage = !!stat.image;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`
        relative group overflow-hidden rounded-2xl min-w-[280px] h-[220px]
        flex-shrink-0 snap-start
        ${hasImage ? "text-white" : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"}
      `}
      style={
        hasImage
          ? { backgroundImage: `url(${stat.image})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      {/* Image overlay */}
      {hasImage && (
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
      )}

      {/* 3D hover tilt effect */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-br from-white/5 to-transparent
          opacity-0 group-hover:opacity-100
          transition-opacity duration-300
          ${hasImage ? "" : "dark:from-white/5 light:from-black/5"}
        `}
      />

      {/* Content */}
      <div className={`relative z-10 h-full flex flex-col justify-center p-8 ${hasImage ? "text-white" : ""}`}>
        <motion.span
          className={`text-4xl md:text-5xl font-bold tracking-tight ${hasImage ? "text-white" : "text-neutral-900 dark:text-white"}`}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: index * 0.1 + 0.2 }}
        >
          {stat.value}
        </motion.span>
        <span className={`mt-2 text-lg font-semibold ${hasImage ? "text-white/90" : "text-neutral-700 dark:text-neutral-300"}`}>
          {stat.label}
        </span>
        <p className={`mt-2 text-sm leading-relaxed ${hasImage ? "text-white/70" : "text-neutral-500 dark:text-neutral-400"}`}>
          {stat.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function CoreValueStats({ stats }: CoreValueStatsProps) {
  return (
    <div className="w-full overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
      <div className="flex gap-4 md:gap-6 px-4 md:px-8 min-w-max md:min-w-0 md:flex-wrap md:justify-center">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>
    </div>
  );
}
