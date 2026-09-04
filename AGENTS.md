# CareerTrack Engineering & Design Rules

## 1. Iconography & Visual Style Rules
- **STRICT PROHIBITION: NEVER use the Sparkles icon (lucide-react or SVG) anywhere in this codebase or landing page.**
- **Preferred Alternatives**: Use intentional, functional icons such as Layers, Zap, BrainCircuit, Briefcase, Cpu, Bot, Grid, or minimalist status dots.

## 2. Design System & Layout Principles
- **Grid Architecture**: Follow the architectural linear blueprint layout with FullWidthDivider lines and DecorIcon (+) corner crosshairs.
- **Theme Support**: Every component and visual must seamlessly support both Dark and Light modes.

## 3. Job Discovery System Audit & Execution Tracker Rule
- **LIVING TRACKER FILE**: Whenever ANY modification, enhancement, bug fix, scraper update, or refactor is made to the Job Discovery pipeline (`src/lib/discovery/`, `src/inngest/functions/batch-job-pipeline.ts`, `src/app/api/jobs/discover/`, `src/components/discovery/`, or discovery DB schemas), **YOU MUST IMMEDIATELY UPDATE `docs/JOB-DISCOVERY-TRACKER.md`**.
- Mark corresponding action items as Completed (`[x]`) or In Progress (`[/]`), record the date, files modified, and append an entry to the Audit Change Log table in `docs/JOB-DISCOVERY-TRACKER.md`.

