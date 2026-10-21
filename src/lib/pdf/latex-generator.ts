import type { TailoredResumeData } from "@/types/tailored-resume"

/**
 * Escapes special LaTeX characters and transforms inline markdown styles
 * into valid LaTeX commands.
 */
export function escapeLatex(text: string | undefined | null): string {
  if (!text) return ""

  // 1. Escape special LaTeX characters first
  let processed = text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")

  // 2. Convert markdown bold (**text**) to \textbf{text}
  processed = processed.replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}")

  // 3. Convert markdown inline code (`code`) to \texttt{code}
  processed = processed.replace(/`([^`]+)`/g, "\\texttt{$1}")

  // 4. Convert arrows (--> or -> or →) to mathematical \rightarrow
  processed = processed.replace(/-->|->|→/g, "$\\rightarrow$")

  return processed
}

/**
 * Normalizes a URL for hyperref usage without double-encoding or syntax breakage.
 */
function sanitizeUrl(url?: string): string {
  if (!url) return ""
  return url.trim().replace(/[\\%#]/g, "")
}

/**
 * Generates an ATS-compliant, publication-ready Overleaf / LaTeX document (.tex)
 * from structured TailoredResumeData.
 */
export function generateLatexResume(data: TailoredResumeData): string {
  const { header, summary, skillsByDomain, experience, projects, education } = data

  const fullName = escapeLatex(header.fullName || "Candidate Name")
  const title = escapeLatex(header.title || "Full Stack Developer")
  const phone = escapeLatex(header.phone)
  const email = escapeLatex(header.email)
  const location = escapeLatex(header.location)

  // Header contact line elements
  const contactLines: string[] = []
  const contactRow1: string[] = []
  if (phone) {
    contactRow1.push(`\\faPhone* \\ ${phone}`)
  }
  if (email) {
    contactRow1.push(`\\href{mailto:${sanitizeUrl(header.email)}}{\\faEnvelope \\ ${email}}`)
  }
  if (header.linkedinUrl) {
    const cleanLinkedin = escapeLatex(header.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, ""))
    contactRow1.push(`\\href{${sanitizeUrl(header.linkedinUrl)}}{\\faLinkedin \\ linkedin.com/in/${cleanLinkedin}}`)
  }
  if (contactRow1.length > 0) {
    contactLines.push(contactRow1.join(" \\quad $|$ \\quad "))
  }

  const contactRow2: string[] = []
  if (header.githubUrl) {
    const cleanGithub = escapeLatex(header.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, ""))
    contactRow2.push(`\\href{${sanitizeUrl(header.githubUrl)}}{\\faGithub \\ github.com/${cleanGithub}}`)
  }
  if (header.portfolioUrl) {
    const cleanPortfolio = escapeLatex(header.portfolioUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""))
    contactRow2.push(`\\href{${sanitizeUrl(header.portfolioUrl)}}{\\faGlobe \\ ${cleanPortfolio}}`)
  }
  if (location && contactRow2.length === 0) {
    contactRow2.push(`\\faMapMarker* \\ ${location}`)
  }
  if (contactRow2.length > 0) {
    contactLines.push(contactRow2.join(" \\quad $|$ \\quad "))
  }

  // Skills block
  let skillsSection = ""
  if (skillsByDomain && skillsByDomain.length > 0) {
    const skillItems = skillsByDomain
      .map(
        (group) =>
          `     \\textbf{${escapeLatex(group.domain)}:}{ ${group.skills.map((s) => escapeLatex(s)).join(", ")} } \\\\ \\vspace{1.5pt}`
      )
      .join("\n")

    skillsSection = `
%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${skillItems}
    }}
 \\end{itemize}
`
  }

  // Summary block (optional)
  let summarySection = ""
  if (summary && summary.trim().length > 0) {
    summarySection = `
%-----------SUMMARY-----------
\\section{Professional Summary}
  \\small{${escapeLatex(summary)}} \\vspace{4pt}
`
  }

  // Projects block
  let projectsSection = ""
  if (projects && projects.length > 0) {
    const projectBlocks = projects
      .map((proj) => {
        const projName = escapeLatex(proj.name)
        const liveLink = proj.link ? `\\href{${sanitizeUrl(proj.link)}}{\\textbf{${projName}} \\small\\faExternalLink*}` : `\\textbf{${projName}}`
        const stackList = proj.stack && proj.stack.length > 0 ? ` $|$ \\emph{\\small ${proj.stack.map((s) => escapeLatex(s)).join(", ")}}` : ""
        const bullets = proj.bullets
          .map((b) => `            \\resumeItem{${escapeLatex(b)}}`)
          .join("\n")

        return `      \\resumeProjectHeading
          {${liveLink}${stackList}}{}
          \\resumeItemListStart
${bullets}
          \\resumeItemListEnd`
      })
      .join("\n\n")

    projectsSection = `
%-----------PROJECTS-----------
\\section{Projects}
    \\resumeSubHeadingListStart
    
${projectBlocks}

    \\resumeSubHeadingListEnd
`
  }

  // Experience block
  let experienceSection = ""
  if (experience && experience.length > 0) {
    const experienceBlocks = experience
      .map((exp) => {
        const role = escapeLatex(exp.role)
        const company = escapeLatex(exp.company)
        const duration = escapeLatex(exp.duration)
        const expLocation = escapeLatex(exp.location || "")
        const bullets = exp.bullets
          .map((b) => `            \\resumeItem{${escapeLatex(b)}}`)
          .join("\n")

        return `      \\resumeSubheading
          {${company}}{${expLocation}}
          {${role}}{${duration}}
          \\resumeItemListStart
${bullets}
          \\resumeItemListEnd`
      })
      .join("\n\n")

    experienceSection = `
%-----------EXPERIENCE-----------
\\section{Experience}
    \\resumeSubHeadingListStart
    
${experienceBlocks}

    \\resumeSubHeadingListEnd
`
  }

  // Education block
  let educationSection = ""
  if (education && education.length > 0) {
    const eduBlocks = education
      .map((edu) => {
        const degree = escapeLatex(edu.degree)
        const institution = escapeLatex(edu.institution)
        const year = escapeLatex(edu.year || "")

        return `    \\resumeSubheading
      {${institution}}{}
      {${degree}}{${year}}`
      })
      .join("\n\n")

    educationSection = `
%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
${eduBlocks}
  \\resumeSubHeadingListEnd
`
  }

  return `\\documentclass[letterpaper,10pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}

\\pagestyle{fancy}
\\fancyhf{} 
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Balanced margins to naturally fill 1 full page
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-0.45in}
\\addtolength{\\textheight}{0.92in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Section formatting with clean horizontal divider
\\titleformat{\\section}{
  \\vspace{-2pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-1pt}]

% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-1.2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{1pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-4pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-2pt}}

\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${fullName}} \\\\ \\vspace{3pt}
    \\small ${title} \\\\ \\vspace{5pt}
    \\small 
    ${contactLines.join(" \\\\ \\vspace{3pt}\n    ")}
\\end{center}
${skillsSection}${summarySection}${projectsSection}${experienceSection}${educationSection}
\\end{document}
`
}
