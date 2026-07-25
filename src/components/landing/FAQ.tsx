"use client"

import { motion } from "framer-motion"
import { FaqsSection } from "@/components/ui/faqs-page"

export default function FAQ() {
  return (
    <section id="faqs" className="bg-background">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <FaqsSection />
      </motion.div>
    </section>
  )
}
