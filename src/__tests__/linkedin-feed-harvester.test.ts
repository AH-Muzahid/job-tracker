import { describe, it, expect } from "vitest"
import {
  synthesizeLinkedInFeedDorkQueries,
  parseLinkedInFeedPostText,
  harvestLinkedInFeedPosts,
} from "@/lib/discovery/linkedin-feed-harvester"

describe("LinkedIn Organic Feed Harvester (Option 2)", () => {
  describe("synthesizeLinkedInFeedDorkQueries", () => {
    it("generates junior targeted Google Dork queries for junior candidates", () => {
      const queries = synthesizeLinkedInFeedDorkQueries({
        skills: ["React", "Next.js", "TypeScript"],
        experienceLevel: "junior",
        location: "Bangladesh",
      })

      expect(queries.length).toBeGreaterThan(0)
      const hasDork = queries.some((q) => q.includes("site:linkedin.com/posts"))
      expect(hasDork).toBe(true)
      const hasJunior = queries.some((q) => q.toLowerCase().includes("junior") || q.toLowerCase().includes("intern"))
      expect(hasJunior).toBe(true)
    })
  })

  describe("parseLinkedInFeedPostText", () => {
    it("authentically parses Raintor Limited feed post from user mobile screenshot", () => {
      const rawPost = `🚀 We're Hiring: Full Stack Developer

Raintor Limited is looking for a skilled and solution-focused Full Stack Developer to join our growing team.

You'll help us:
• Develop responsive and scalable web applications
• Build and maintain frontend and backend systems
• Integrate APIs, databases, and third-party services
• Identify technical issues and implement practical solutions
• Collaborate with designers and other team members

Work Mode: Remote
Employment: Monthly salary-based
Salary: Based on skills and experience

Apply Now: https://lnkd.in/gFfmfi8Z

Build. Create. Ship.
Join Raintor Limited and help us turn ideas into reliable digital products.
Raintor Limited — Software & IT Agency
#Hiring #FullStackDeveloper #RemoteJob #DeveloperJobs #TechJobs #SoftwareDevelopment #RaintorLimited`

      const job = parseLinkedInFeedPostText(rawPost)
      expect(job).not.toBeNull()
      expect(job?.company).toBe("Raintor Limited")
      expect(job?.title).toBe("Full Stack Developer")
      expect(job?.location).toBe("Remote")
      expect(job?.url).toBe("https://lnkd.in/gFfmfi8Z")
      expect(job?.sourceBoard).toBe("linkedin_post")
      expect(job?.salary).toBe("Based on skills and experience")
      expect(job?.tags).toContain("fullstack")
    })

    it("returns null for non-tech garbage or short status updates", () => {
      const garbage = "Congratulations to our team for winning the cricket match! Happy weekend everyone!"
      const job = parseLinkedInFeedPostText(garbage)
      expect(job).toBeNull()
    })
  })

  describe("harvestLinkedInFeedPosts", () => {
    it("harvests organic feed posts matching candidate profile", async () => {
      const jobs = await harvestLinkedInFeedPosts({
        skills: ["React", "Node.js"],
        experienceLevel: "junior",
        location: "Bangladesh",
      })

      expect(jobs.length).toBeGreaterThan(0)
      const raintorJob = jobs.find((j) => j.company.includes("Raintor"))
      expect(raintorJob).toBeDefined()
      expect(raintorJob?.url).toBe("https://lnkd.in/gFfmfi8Z")
    })
  })
})
