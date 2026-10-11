import { describe, it, expect } from "vitest"
import { renderMarkdownToEmailHtml, formatDailyOpportunityDigestHtml } from "@/lib/email"

describe("renderMarkdownToEmailHtml", () => {
  it("renders plain text into paragraph", () => {
    const html = renderMarkdownToEmailHtml("Hello candidate, this is a plain message.")
    expect(html).toContain("<p")
    expect(html).toContain("Hello candidate, this is a plain message.")
    expect(html).toContain("</p>")
  })

  it("converts bold markdown into strong tags with inline styling", () => {
    const html = renderMarkdownToEmailHtml("Please review **Frontend Developer** role.")
    expect(html).toContain("<strong")
    expect(html).toContain("Frontend Developer")
    expect(html).not.toContain("**")
  })

  it("converts standalone bold titles into clean subheaders", () => {
    const html = renderMarkdownToEmailHtml("**Daily Career Briefing – AH Muzahid**\n\n**Pipeline:**")
    expect(html).toContain("Daily Career Briefing – AH Muzahid")
    expect(html).toContain("Pipeline:")
    expect(html).not.toContain("**")
  })

  it("renders bullet lists using standard ul/li tags", () => {
    const input = [
      "• 5 applications packaged and staged for submission.",
      "• 0 active/stale follow-ups pending.",
      "• 0 high-fit opportunities discovered in this cycle.",
    ].join("\n")

    const html = renderMarkdownToEmailHtml(input)
    expect(html).toContain("<ul")
    expect(html).toContain("<li")
    expect(html).toContain("5 applications packaged")
    expect(html).toContain("0 active/stale")
    expect(html).toContain("</ul>")
  })

  it("renders numbered lists with nested bullet lists and bold tags without asterisks", () => {
    const input = `**Top 3 actions today:**
1. **Submit the 5 staged applications now** to ensure they hit hiring team inboxes:
   - **Frontend Developer** at RedTech
   - **Frontend Developer** at NextWave
2. **Review outreach channels:** Check LinkedIn.
3. **Log status updates:** Once submitted.`

    const html = renderMarkdownToEmailHtml(input)
    expect(html).not.toContain("**")
    expect(html).toContain("<ol")
    expect(html).toContain("</ol>")
    expect(html).toContain("<ul")
    expect(html).toContain("RedTech")
    expect(html).toContain("NextWave")
    expect(html).toContain("Review outreach channels:")
  })

  it("escapes html characters while formatting markdown links", () => {
    const input = "Check <test> & [CareerTrack](https://example.com)"
    const html = renderMarkdownToEmailHtml(input)
    expect(html).toContain("&lt;test&gt;")
    expect(html).toContain("&amp;")
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain("CareerTrack</a>")
  })

  it("perfectly formats the exact real-world briefing from user email screenshot", () => {
    const input = `**Daily Career Briefing – AH Muzahid**

**Pipeline:**
• 5 applications packaged and staged for submission.
• 0 active/stale follow-ups pending.
• 0 high-fit opportunities discovered in this cycle.

**Top 3 actions today:**
1. **Submit the 5 staged applications now** to ensure they hit hiring team inboxes before the weekend:
   - **Frontend Developer** at RedTech
   - **Frontend Developer** at NextWave
   - **Frontend Engineer** at Apex Solutions
   - **Full Stack Developer** at InnoSoft
   - **Software Engineer - Frontend** at DevSphere
2. **Review outreach channels:** Check LinkedIn or direct recruiter contacts for these 5 companies to identify hiring managers.
3. **Log status updates:** Once submitted, transition these applications from "Staged" to "Applied" to start follow-up tracking.`

    const html = renderMarkdownToEmailHtml(input)
    expect(html).not.toContain("**")
    expect(html).toContain("Daily Career Briefing – AH Muzahid")
    expect(html).toContain("Pipeline:")
    expect(html).toContain("<ol")
    expect(html).toContain("</ol>")
    expect(html).toContain("<ul")
    expect(html).toContain("RedTech")
    expect(html).toContain("NextWave")
    expect(html).toContain("Apex Solutions")
    expect(html).toContain("InnoSoft")
    expect(html).toContain("DevSphere")
  })
})

describe("formatDailyOpportunityDigestHtml with rendered markdown", () => {
  it("formats complete daily digest with markdown-parsed briefing", () => {
    const briefingText = `**Daily Career Briefing – AH Muzahid**

**Pipeline:**
• 5 applications packaged and staged for submission.

**Top 3 actions today:**
1. **Submit the 5 staged applications now**:
   - **Frontend Developer** at RedTech`

    const html = formatDailyOpportunityDigestHtml({
      candidateName: "AH Muzahid",
      briefingText,
      activeApplicationsCount: 5,
      staleApplicationsCount: 0,
    })

    expect(html).toContain("AH Muzahid")
    expect(html).not.toContain("**Daily Career Briefing")
    expect(html).not.toContain("**Pipeline:**")
    expect(html).not.toContain("**Submit")
    expect(html).toContain("RedTech")
    expect(html).toContain("<strong")
    expect(html).toContain("<ol")
    expect(html).toContain("<ul")
  })
})
