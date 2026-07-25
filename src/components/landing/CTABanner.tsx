"use client"

import { motion } from "framer-motion"
import { CallToAction } from "@/components/cta"

export default function CTABanner() {
  return (
    <section className="bg-background">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <CallToAction />
      </motion.div>
    </section>
  )
}
