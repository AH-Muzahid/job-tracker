export function getProfilePrompt(): string {
  return `You are in PROFILE MODE.

Collect the user's profile information. Ask for all of the following if not already provided:
1. Full name, email, phone, location
2. LinkedIn, GitHub, Portfolio links
3. Best 3 projects with name, stack, live link, repo link, description
4. Job preference — roles, location preference, remote/onsite/hybrid, salary expectation
5. Experience level — fresher / internship-ready / junior / career switcher
6. Current application status — already applying or not, how many jobs applied, any interviews/tasks yet
7. Weekly availability — hours per day for job search, best days
8. Main weaknesses — resume, communication, confidence, technical interviews, DSA, JavaScript/React/Node, outreach, consistency
9. Optional — preferred companies, preferred industries, English level, notice period, current job status

After collecting, summarize the profile, identify missing critical pieces, and suggest priority fixes.`
}
