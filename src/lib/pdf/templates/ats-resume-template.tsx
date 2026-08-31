/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer"
import type { TailoredResumeData } from "@/types/tailored-resume"

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.35,
  },
  headerSection: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#111827",
    paddingBottom: 10,
    marginBottom: 12,
    textAlign: "center",
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: "#0f172a",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    fontSize: 8.5,
    color: "#475569",
  },
  contactItem: {
    color: "#475569",
    textDecoration: "none",
  },
  section: {
    marginBottom: 11,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#0f172a",
    borderBottomWidth: 0.8,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 9,
    color: "#334155",
    lineHeight: 1.4,
  },
  experienceItem: {
    marginBottom: 7,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  roleText: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  companyText: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#334155",
  },
  dateText: {
    fontSize: 8.5,
    color: "#64748b",
    fontFamily: "Helvetica",
  },
  bulletList: {
    marginTop: 2,
    paddingLeft: 4,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 2.5,
  },
  bulletDot: {
    width: 10,
    fontSize: 9,
    color: "#475569",
  },
  bulletContent: {
    flex: 1,
    fontSize: 8.8,
    color: "#334155",
    lineHeight: 1.35,
  },
  skillDomainRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  skillDomainLabel: {
    width: 110,
    fontSize: 8.8,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  skillDomainValues: {
    flex: 1,
    fontSize: 8.8,
    color: "#334155",
  },
  projectItem: {
    marginBottom: 6,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  projectName: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  projectStack: {
    fontSize: 8.2,
    color: "#64748b",
    fontFamily: "Helvetica-Oblique",
  },
})

export interface ATSResumeProps {
  data: TailoredResumeData
}

export function ATSResumeDocument({ data }: ATSResumeProps) {
  const { header, summary, skillsByDomain, experience, projects, education } = data

  const contactParts: React.ReactNode[] = []
  if (header.email) {
    contactParts.push(
      <Link key="email" src={`mailto:${header.email}`} style={styles.contactItem}>
        {header.email}
      </Link>
    )
  }
  if (header.phone) {
    contactParts.push(<Text key="phone">{header.phone}</Text>)
  }
  if (header.location) {
    contactParts.push(<Text key="location">{header.location}</Text>)
  }
  if (header.linkedinUrl) {
    contactParts.push(
      <Link key="linkedin" src={header.linkedinUrl} style={styles.contactItem}>
        LinkedIn
      </Link>
    )
  }
  if (header.githubUrl) {
    contactParts.push(
      <Link key="github" src={header.githubUrl} style={styles.contactItem}>
        GitHub
      </Link>
    )
  }
  if (header.portfolioUrl) {
    contactParts.push(
      <Link key="portfolio" src={header.portfolioUrl} style={styles.contactItem}>
        Portfolio
      </Link>
    )
  }

  return (
    <Document title={`${header.fullName || "Candidate"} - Resume`} author="CareerTrack AI">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.name}>{header.fullName || "Professional Resume"}</Text>
          {header.title ? <Text style={styles.title}>{header.title}</Text> : null}
          <View style={styles.contactRow}>
            {contactParts.map((item, idx) => (
              <React.Fragment key={idx}>
                {item}
                {idx < contactParts.length - 1 ? <Text> • </Text> : null}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Professional Summary */}
        {summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* Skills by Domain */}
        {skillsByDomain && skillsByDomain.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Expertise</Text>
            {skillsByDomain.map((domainGroup, idx) => (
              <View key={idx} style={styles.skillDomainRow}>
                <Text style={styles.skillDomainLabel}>{domainGroup.domain}:</Text>
                <Text style={styles.skillDomainValues}>{domainGroup.skills.join(", ")}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Work Experience */}
        {experience && experience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
            {experience.map((exp, idx) => (
              <View key={idx} style={styles.experienceItem}>
                <View style={styles.itemHeader}>
                  <View>
                    <Text style={styles.roleText}>{exp.role}</Text>
                    <Text style={styles.companyText}>
                      {exp.company}
                      {exp.location ? ` | ${exp.location}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{exp.duration}</Text>
                </View>
                {exp.bullets && exp.bullets.length > 0 ? (
                  <View style={styles.bulletList}>
                    {exp.bullets.map((bullet, bIdx) => (
                      <View key={bIdx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletContent}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Key Projects */}
        {projects && projects.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Projects</Text>
            {projects.map((proj, idx) => (
              <View key={idx} style={styles.projectItem}>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{proj.name}</Text>
                  {proj.stack && proj.stack.length > 0 ? (
                    <Text style={styles.projectStack}>{proj.stack.join(" • ")}</Text>
                  ) : null}
                </View>
                {proj.bullets && proj.bullets.length > 0 ? (
                  <View style={styles.bulletList}>
                    {proj.bullets.map((b, bIdx) => (
                      <View key={bIdx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletContent}>{b}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Education */}
        {education && education.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu, idx) => (
              <View key={idx} style={styles.itemHeader}>
                <View>
                  <Text style={styles.roleText}>{edu.degree}</Text>
                  <Text style={styles.companyText}>{edu.institution}</Text>
                </View>
                {edu.year ? <Text style={styles.dateText}>{edu.year}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
