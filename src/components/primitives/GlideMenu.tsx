"use client";

import React, { useRef, useState, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlideMenuProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  rowSelector?: string;
  highlightClassName?: string;
  className?: string;
}

export default function GlideMenu({
  children,
  rowSelector = "[data-row], [data-menu-row]",
  highlightClassName = "bg-hover-2 rounded-[8px]",
  className = "",
  ...props
}: GlideMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    opacity: number;
  }>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const target = (e.target as HTMLElement).closest(rowSelector) as HTMLElement | null;
    if (target && containerRef.current.contains(target)) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      setStyle({
        top: targetRect.top - containerRect.top + containerRef.current.scrollTop,
        left: targetRect.left - containerRect.left + containerRef.current.scrollLeft,
        width: targetRect.width,
        height: targetRect.height,
        opacity: 1,
      });
    }
  };

  const handlePointerLeave = () => {
    setStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn("relative", className)}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-0 transition-[top,left,width,height,opacity] duration-150 ease-out",
          highlightClassName
        )}
        style={{
          top: style.top,
          left: style.left,
          width: style.width,
          height: style.height,
          opacity: style.opacity,
        }}
      />
      {children}
    </div>
  );
}
