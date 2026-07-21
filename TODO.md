# CareerTrack — Remaining Work

## 🔴 High Priority

- [ ] **Extract shared auth helper** — `getOrCreateUser()` duplicated in 3 API route files; move to `src/lib/auth.ts`
- [ ] **Add `loading.tsx` / `error.tsx`** — Route-level Suspense boundaries for App Router pages
- [ ] **Customize README** — Replace default create-next-app template
- [ ] **Update `.env.example`** — Missing `DIRECT_URL`, Supabase env vars
- [ ] **Remove dead Supabase code** — `src/utils/supabase/` never imported anywhere
- [ ] **Pagination** — `/api/applications` returns all records; add `skip`/`take` query params
- [ ] **Stats API optimization** — Replace in-memory `.filter()` with Prisma `groupBy`

## 🟡 Medium Priority

- [ ] Dark mode toggle
- [ ] Mobile-responsive table (card layout on small screens)
- [ ] Search debounce (300ms)
- [ ] URL query param sync for filters/sort
- [ ] Toast notifications (sonner)
- [ ] Unsaved form leave confirmation
- [ ] Customize footer placeholder text

## 🟢 Low Priority / Future

- [ ] CSV export/import
- [ ] Status change timeline
- [ ] Email reminders
- [ ] Tags/labels
- [ ] File attachments (resume upload)
- [ ] Dashboard charts/analytics
- [ ] Unit & E2E tests
- [ ] CI/CD pipeline
- [ ] Rate limiting
- [ ] Production deployment config
