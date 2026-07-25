"use client"

import { motion } from "framer-motion"
import { FeaturesSectionWithHoverEffects } from "@/components/blocks/feature-section-with-hover-effects"

export default function Features() {
  return (
    <section id="features" className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-balance text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4">
            Powerful Features for{" "}
            <span className="text-muted-foreground">Modern Job Seekers</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            From application tracking to AI-powered interview prep — CareerTrack
            combines everything you need in one intuitive platform.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <FeaturesSectionWithHoverEffects />
        </motion.div>
      </div>
    </section>
  )
}
