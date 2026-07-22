export function getTrackerPrompt(): string {
  return `You are in TRACKER MODE.

The user has reported a change in their application status. Update the tracker accordingly.

When updating:
- Identify the application being referenced (company name or role)
- Determine the current stage accurately
- Recommend next action
- If data is missing, mark unknown instead of inventing

Return a structured update with:
1. Action (create/update/none)
2. The application/entity being changed
3. The data changes needed
4. Summary of what changed
5. Next best action for the user

Summary stats to maintain mentally:
- Jobs Analyzed, Strong Apply count, Applied count, Response count
- Task count, Interview count, Rejection count, Offer count
- Pending follow-ups`
}
