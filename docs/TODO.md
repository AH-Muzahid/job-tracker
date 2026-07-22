# CareerTrack — Remaining Work

## ✅ Completed

### High Priority
- [x] Extract shared auth helper — `src/lib/auth.ts`
- [x] Add `loading.tsx` / `error.tsx` — Route-level Suspense boundaries
- [x] Customize README
- [x] Update `.env.example`
- [x] Remove dead Supabase code — `src/utils/supabase/`
- [x] Pagination — `/api/applications` with `page`/`pageSize` params
- [x] Stats API optimization — Prisma `groupBy` + `Promise.all`

### Medium Priority
- [x] Dark mode toggle — localStorage persistence
- [x] Mobile-responsive table — card layout on small screens
- [x] Search debounce — 300ms custom hook
- [x] URL query param sync for filters/sort
- [x] Toast notifications — sonner
- [x] Unsaved form leave confirmation — `beforeunload`
- [x] Customize footer text

### Low Priority
- [x] CSV export — `/api/applications/export`
- [x] Status change timeline — `StatusChange` model + API + UI
- [x] Tags/labels — `Tag` + `ApplicationTag` models + API + UI
- [x] Dashboard charts — recharts (bar + pie)
- [x] Unit tests — Vitest + `cn()` tests
- [x] CI/CD pipeline — GitHub Actions
- [x] Production deployment — Dockerfile + standalone output
- [x] Dashboard Kanban board — Board/List/Table views matching reference

## 🔴 Remaining (Future)

- [ ] Email reminders — Application deadline notifications
- [ ] File attachments — Resume upload with Supabase Storage
- [ ] Rate limiting — API protection
- [ ] E2E tests — Playwright/Cypress
- [ ] Drag-and-drop — Move cards between columns on board
- [ ] Bulk actions — Select multiple and change status
