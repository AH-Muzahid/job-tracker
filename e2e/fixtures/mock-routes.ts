import type { Page } from "@playwright/test"

/**
 * Creates SSE formatted chunks from an array of events
 */
export function createSSEPayload(
  events: Array<{ event: string; data: Record<string, unknown> }>
): string {
  return events
    .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
    .join("")
}

/**
 * Common Clerk Auth & User mock for all protected E2E routes
 */
export async function setupAuthMock(page: Page) {
  // Set cookies for middleware and client session recognition
  await page.context().addCookies([
    {
      name: "playwright_test_auth",
      value: "1",
      domain: "localhost",
      path: "/",
    },
    {
      name: "__session",
      value: "mock_jwt_session_test_token_playwright",
      domain: "localhost",
      path: "/",
    },
    {
      name: "__client_uat",
      value: String(Math.floor(Date.now() / 1000)),
      domain: "localhost",
      path: "/",
    },
  ])

  // Mock Clerk client-side session / user endpoints across all hostnames
  await page.route(/.*(clerk|accounts\.dev).*\/(v1\/client|v1\/environment).*/, async (route) => {
    const url = route.request().url()
    if (url.includes("environment")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          auth_config: { single_session_mode: true },
          display_config: { theme: { general: { color: "#000" } } },
          user_settings: { sign_in: { identification_strategies: ["email_address"] } },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        response: {
          id: "client_mock_123",
          status: "active",
          sessions: [
            {
              id: "sess_mock_test_123",
              status: "active",
              expire_at: Date.now() + 86400000,
              abandon_at: Date.now() + 86400000,
              last_active_at: Date.now(),
              user: {
                id: "user_mock_test_123",
                first_name: "Test",
                last_name: "Candidate",
                primary_email_address_id: "email_123",
                email_addresses: [
                  {
                    id: "email_123",
                    email_address: "test@careertrack.ai",
                    verification: { status: "verified" },
                  },
                ],
              },
            },
          ],
          last_active_session_id: "sess_mock_test_123",
        },
        client: {
          sessions: [
            {
              id: "sess_mock_test_123",
              status: "active",
              expire_at: Date.now() + 86400000,
              abandon_at: Date.now() + 86400000,
              last_active_at: Date.now(),
              user: {
                id: "user_mock_test_123",
                first_name: "Test",
                last_name: "Candidate",
                primary_email_address_id: "email_123",
                email_addresses: [
                  {
                    id: "email_123",
                    email_address: "test@careertrack.ai",
                    verification: { status: "verified" },
                  },
                ],
              },
            },
          ],
          last_active_session_id: "sess_mock_test_123",
        },
      }),
    })
  })

  // Mock Clerk telemetry & touch endpoints
  await page.route(/.*(clerk|accounts\.dev).*\/touch.*/, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })
}

/**
 * Mission 1: Mock LangGraph Agent Streaming API
 */
export async function setupAgentStreamMock(
  page: Page,
  options?: {
    planSteps?: Array<{ id: string; task: string; status: "pending" | "in_progress" | "completed"; toolName?: string }>
    toolInvocations?: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown>; result?: unknown }>
    finalResponse?: string
    includeInterrupt?: boolean
  }
) {
  const plan = options?.planSteps || [
    { id: "step-1", task: "Analyze market vacancies for Go & PostgreSQL", status: "completed", toolName: "searchApplications" },
    { id: "step-2", task: "Query pgvector candidate memories & skill graph", status: "completed", toolName: "searchUserMemories" },
    { id: "step-3", task: "Draft high-conversion recruiter outreach email", status: "completed", toolName: "draftOutreachEmail" },
  ]

  const toolInvocations = options?.toolInvocations || [
    {
      toolCallId: "tool-1",
      toolName: "searchExternalJobs",
      args: { query: "Senior Backend Engineer Go" },
      result: { count: 3, opportunities: [{ title: "Senior Go Engineer", company: "Stripe" }] },
    },
    {
      toolCallId: "tool-2",
      toolName: "draftOutreachEmail",
      args: { company: "Stripe", role: "Senior Go Engineer" },
      result: {
        subject: "Senior Go Engineer Application - Candidate",
        body: "Hi Team,\n\nI noticed Stripe is scaling its Go infrastructure...",
      },
    },
  ]

  const responseContent =
    options?.finalResponse ||
    "I have analyzed your request, queried relevant market opportunities, and tailored a high-conversion outreach strategy for Stripe."

  await page.route("**/api/agent/run", async (route) => {
    const postData = route.request().postDataJSON() || {}

    // If resuming an interrupted action
    if (postData.resumeAction) {
      const resumeStream = createSSEPayload([
        {
          event: "executor",
          data: {
            toolName: "sendOutreachEmailViaResend",
            toolCallId: "resume-call-1",
            result: { success: true, messageId: "email_msg_999" },
          },
        },
        {
          event: "responder",
          data: { responseContent: "Action confirmed! The outreach email has been safely dispatched via Resend." },
        },
        {
          event: "done",
          data: {
            state: {
              responseContent: "Action confirmed! The outreach email has been safely dispatched via Resend.",
              plan: plan.map((p) => ({ ...p, status: "completed" })),
            },
          },
        },
      ])

      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Session-Id": postData.sessionId || "test-session-123",
        },
        body: resumeStream,
      })
      return
    }

    // Normal multi-step stream execution
    const events: Array<{ event: string; data: Record<string, unknown> }> = [
      {
        event: "planner",
        data: {
          goal: postData.message || "Job Search Strategy",
          plan: plan,
          currentStepIndex: 0,
        },
      },
    ]

    for (const tool of toolInvocations) {
      events.push({
        event: "executor",
        data: {
          toolName: tool.toolName,
          toolCallId: tool.toolCallId,
          args: tool.args,
          result: tool.result,
        },
      })
    }

    if (options?.includeInterrupt) {
      events.push({
        event: "interrupt",
        data: {
          interrupts: [
            {
              value: {
                actionRequired: "sendOutreachEmailViaResend",
                toolName: "sendOutreachEmailViaResend",
                message: "Please confirm sending the outreach email to Stripe recruiter.",
                args: {
                  to: "recruiter@stripe.com",
                  subject: "Senior Go Engineer Application",
                  body: "Hi Team,\n\nI noticed Stripe is hiring Go Engineers...",
                },
              },
            },
          ],
        },
      })
    } else {
      events.push(
        {
          event: "responder",
          data: { responseContent },
        },
        {
          event: "done",
          data: {
            state: {
              responseContent,
              plan,
            },
          },
        }
      )
    }

    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Session-Id": postData.sessionId || "test-session-123",
      },
      body: createSSEPayload(events),
    })
  })

  // Mock sessions creation & listing
  await page.route("**/api/ai/sessions**", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON() || {}
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "sess_mock_test_123",
          title: payload.title || "Senior Go Role Search",
          mode: payload.mode || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { messages: 0 },
        }),
      })
      return
    }

    const url = route.request().url()
    if (url.includes("/api/ai/sessions/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "sess_mock_test_123",
          title: "Senior Go Role Search",
          messages: [],
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  })
}

/**
 * Mission 2: Mock Multi-Board Discovery API
 */
export async function setupDiscoveryMock(page: Page) {
  const mockOpportunities = [
    {
      id: "job-remoteok-101",
      title: "Senior Full Stack Engineer (TypeScript / Next.js)",
      company: "Vercel Partner",
      location: "Remote",
      salary: "$140,000 - $170,000",
      url: "https://remoteok.com/l/101",
      source: "RemoteOK",
      tags: ["TypeScript", "Next.js", "React", "Remote"],
      fitScore: 94,
      matchRationale: "Matches 94% of candidate skills with Next.js, TypeScript, and Server Components.",
      postedAt: new Date().toISOString(),
    },
    {
      id: "job-arbeitnow-202",
      title: "Backend Go Developer (Distributed Systems)",
      company: "Klarna",
      location: "Berlin, Germany / Remote",
      salary: "€95,000 - €120,000",
      url: "https://arbeitnow.com/jobs/202",
      source: "Arbeitnow",
      tags: ["Go", "Kubernetes", "PostgreSQL"],
      fitScore: 88,
      matchRationale: "Matches Go concurrency, PostgreSQL, and high-throughput microservices.",
      postedAt: new Date().toISOString(),
    },
    {
      id: "job-adzuna-303",
      title: "Staff Software Engineer (AI & Platform)",
      company: "Datadog",
      location: "New York, NY / Remote",
      salary: "$190,000 - $225,000",
      url: "https://adzuna.com/jobs/303",
      source: "Adzuna",
      tags: ["Python", "AI", "Distributed Systems"],
      fitScore: 82,
      matchRationale: "Strong alignment with LangGraph and observability infrastructure.",
      postedAt: new Date().toISOString(),
    },
  ]

  await page.route("**/api/jobs/discover*", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: `app-saved-${Date.now()}`,
            companyName: payload.companyName,
            jobTitle: payload.jobTitle,
            status: "Saved",
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          opportunities: mockOpportunities,
          count: mockOpportunities.length,
        },
      }),
    })
  })

  await page.route("**/api/applications**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        applications: [
          {
            id: "app-saved-101",
            companyName: "Vercel Partner",
            jobTitle: "Senior Full Stack Engineer (TypeScript / Next.js)",
            status: "Saved",
          },
        ],
      }),
    })
  })
}

/**
 * Mission 3: Mock ATS Resume Tailoring and Vector PDF Download API
 */
export async function setupResumeTailoringMock(page: Page) {
  const tailoredResumeData = {
    id: "tailored-resume-101",
    targetCompany: "Stripe",
    targetRole: "Senior Backend Engineer",
    matchScore: 94,
    skillsMatched: ["Go", "PostgreSQL", "Kafka", "Redis"],
    skillsMissing: ["GraphQL"],
    header: {
      fullName: "Alex Rivera",
      title: "Senior Backend Engineer",
      email: "alex.rivera@example.com",
      location: "San Francisco, CA",
      linkedinUrl: "https://linkedin.com/in/alexrivera",
      githubUrl: "https://github.com/alexrivera",
      portfolioUrl: "https://alexrivera.dev",
    },
    summary: "Senior Backend Engineer with 6+ years specializing in distributed systems, high-concurrency Go services, and resilient PostgreSQL architecture.",
    skillsByDomain: [
      {
        domain: "Backend & Systems",
        skills: ["Go", "TypeScript", "Node.js", "gRPC", "Kafka"],
      },
      {
        domain: "Databases & Cloud",
        skills: ["PostgreSQL", "pgvector", "Redis", "Docker", "Kubernetes", "AWS"],
      },
    ],
    experience: [
      {
        role: "Senior Backend Engineer",
        company: "FinTech Scaleup",
        duration: "2022 - Present",
        location: "Remote",
        bullets: [
          "Architected real-time transaction pipeline in Go processing 15,000 req/sec with <15ms p99 latency.",
          "Implemented PostgreSQL connection pooling and pgvector semantic indexing, cutting query latencies by 42%.",
        ],
      },
    ],
    projects: [
      {
        name: "Distributed Event Pipeline",
        stack: ["Go", "Kafka", "PostgreSQL"],
        link: "https://github.com/alexrivera/event-pipe",
        bullets: [
          "Engineered resilient multi-partition event streaming engine handling 100k events/sec.",
        ],
      },
    ],
    education: [
      {
        degree: "B.S. in Computer Science",
        institution: "University of California, Berkeley",
        year: "2018",
      },
    ],
  }

  // Mock tailoring generation
  await page.route("**/api/resumes/tailor**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        matchScore: 94,
        data: tailoredResumeData,
      }),
    })
  })

  // Mock PDF vector download endpoint
  await page.route("**/api/resumes/download/preview**", async (route) => {
    // Generate a minimal valid dummy PDF binary
    const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 712 Td
(CareerTrack ATS Resume) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
299
%%EOF`

    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Stripe-Tailored-Resume.pdf"',
      },
      body: Buffer.from(minimalPdf, "utf-8"),
    })
  })

  // Mock resumes list
  await page.route("**/api/resumes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        resumes: [
          {
            id: "res-base-1",
            title: "Standard Senior Backend Resume",
            fileName: "resume-base.pdf",
            fileUrl: "/mock/resume-base.pdf",
            fileSize: 48200,
            isDefault: true,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    })
  })
}
