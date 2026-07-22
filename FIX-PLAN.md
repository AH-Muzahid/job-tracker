# AI Assistant - User Data Management Fix Plan

## Problems Identified

### 1. No Forced Onboarding
- New users skip `/profile-setup` and go directly to `/ai-assistant`
- AI gets empty context, produces generic responses
- **Impact:** Poor first experience, AI can't personalize

### 2. Profile Setup Not Accessible
- No sidebar link to `/profile-setup`
- Users can't easily update profile later
- **Impact:** Profile stays incomplete forever

### 3. Name Display Bug
- `context-builder.ts:40` shows `Name: ${profile.userId}` (UUID)
- Should show actual user name from Clerk or User table
- **Impact:** AI calls user by UUID, looks broken

### 4. Resume Content Unused
- AI only sees `title` and `fileName`
- Actual resume content never loaded
- **Impact:** AI can't reference resume for cover letters, JD analysis

### 5. Rich Data Tables Ignored
- `PrepNote`, `Company`, `StatusChange`, `Tag`, `ApplicationAnalysis` never loaded
- **Impact:** AI misses valuable context

---

## Fix Plan

### Phase 1: Critical Fixes (Immediate)

#### 1.1 First-Login Onboarding Redirect
**File:** `src/middleware.ts`
- Check if `UserProfile` exists for authenticated user
- If not, redirect to `/profile-setup` (except for `/profile-setup` and API routes)

#### 1.2 Add Profile Link to Sidebar
**File:** `src/components/Sidebar.tsx`
- Add `UserCircle` icon with "Profile" label
- Link to `/profile-setup`

#### 1.3 Fix Name Bug
**File:** `src/lib/ai/context-builder.ts`
- Join with `User` table to get `name` field
- Use `user.name` instead of `profile.userId`

### Phase 2: AI Data Collection (Smart Onboarding)

#### 2.1 Detect Empty Profile in AI Chat
**File:** `src/lib/ai/context-builder.ts`
- Return flag `hasProfile: false` when profile is null/empty

#### 2.2 Profile Mode Enhancement
**File:** `src/lib/ai/prompts/profile.ts`
- When profile empty, AI should:
  1. Explain why profile matters
  2. Ask for key fields one-by-one (not overwhelming)
  3. Save via API as user provides

#### 2.3 Chat API Profile Save
**File:** `src/app/api/ai/chat/route.ts`
- Detect profile-related responses
- Auto-save to `UserProfile` table

### Phase 3: Resume Integration

#### 3.1 Resume Content Parsing
**File:** `src/lib/ai/context-builder.ts`
- Fetch resume content (if text-based)
- Include in AI context

#### 3.2 Resume Upload Improvement
**File:** `src/app/(app)/resumes/page.tsx`
- Add file upload (not just URL)
- Parse resume text for AI

### Phase 4: Rich Data Integration

#### 4.1 Load All Relevant Tables
**File:** `src/lib/ai/context-builder.ts`
- Add: `PrepNote`, `Company`, `ApplicationAnalysis`
- Add: Recent `StatusChange` history

#### 4.2 Context Optimization
- Limit each to prevent token overflow
- Priority: recent > older

---

## Implementation Order

1. Fix name bug (5 min)
2. Add sidebar profile link (5 min)
3. First-login redirect (15 min)
4. AI profile detection + smart collection (30 min)
5. Resume content integration (30 min)
6. Rich data tables (20 min)

**Total estimated time:** ~2 hours

---

## Success Criteria

- [ ] New users auto-redirect to profile setup
- [ ] Profile link visible in sidebar
- [ ] AI shows correct user name
- [ ] AI asks for profile data when empty
- [ ] Resume content available to AI
- [ ] All relevant data tables loaded in context
