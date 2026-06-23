# CLAUDE.md — Instructions for Claude Code

## Project
AISmetchikV9 — Next.js 16 + MongoDB + MinIO + AI (Xiaomi MiMo + OpenRouter)

## Stack
- Next.js 16.2.1 (Turbopack)
- Tailwind CSS v4.2.2
- NextAuth (credentials provider)
- MongoDB (local Docker on port 27017)
- MinIO S3 (local Docker on ports 9000/9001)
- TypeScript strict

## Commands
- Dev: `npm run dev` (port 3000)
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Test: `npx playwright test tests/e2e/full-audit.spec.ts`
- Smoke: `npx playwright test tests/e2e/full-audit.spec.ts -g "01 Landing"`

## QA Credentials
- Email: qa@example.com
- Password: changeme123
- User ID: qa_1781528371386

## Docker Infrastructure
- MongoDB: localhost:27017 (no auth, database: aismetchik)
- MongoDB Logs: localhost:27018
- MinIO: localhost:9000 (API), localhost:9001 (Console)
- MinIO creds: minioadmin/minioadmin
- MinIO bucket: aismetchik

## Source of Truth
- Navigation: `src/lib/navigation.ts` and `src/proxy.ts`
- AI Config: `src/lib/ai-config.json`
- AI Service: `src/services/ai.ts` and `src/services/xiaomi.ts`
- S3 Config: MongoDB `configs/envSettings` document

## Critical Rules
1. Always write in Russian for user-facing text
2. Before pushing to main: `npm run typecheck && npm run lint && npm run build`
3. Never delete files without asking (use trash)
4. Tailwind v4: `@apply` cannot reference custom component classes defined in same `@layer components`
5. All AI models from ai-config.json must appear in the correct provider tab

## Current Tasks (Priority Order)

### ~~1. Fix AI Provider Tabs in Admin Panel~~ ✅ RESOLVED
### ~~2. Fix S3 Upload Error (400 from MinIO)~~ ✅ RESOLVED
### ~~3. Fix LLM Timeout Error~~ ✅ RESOLVED

### 4. Dev Mode Toggle
Add ability to switch between local and production infrastructure:
- Local: Docker MongoDB (localhost:27017), MinIO (localhost:9000)
- Production: Cloud MongoDB, Cloud S3
- Toggle in admin panel `/dashboard/admin/settings`
- When toggled, update `configs/envSettings` in MongoDB
- All services should read from this config dynamically

### 5. Design System Cleanup (see analysis below)
Remove dead `design-system/` directory and unused CSS classes from `src/app/globals.css`.

### 6. Landing Page Visual Improvements (see recommendations below)
Apply design token consistency, add missing visual elements, fix hardcoded colors.

### 7. Test ALL Buttons and Routes
Run comprehensive Playwright tests on every page and button:
- Dashboard: file upload, analyze, manual input, active projects, archive
- Calculator: all buttons
- Price Base: search, sort, filter, add, edit, delete, import/export
- Billing: all buttons, top-up dialogs
- Profile: all fields, save, document generation
- Admin: all tabs, all settings
- CRM: all operations
- Support/Tickets: all operations

## File Structure
```
src/
├── app/              # Next.js app router pages
│   ├── api/          # API routes
│   ├── auth/         # Auth pages
│   ├── dashboard/    # Main dashboard
│   ├── partner/      # Partner portal (redirects to /dashboard)
│   └── crm/          # CRM portal
├── actions/          # Server actions
├── components/       # React components
├── contexts/         # React contexts
├── lib/              # Libraries and configs
├── services/         # AI services
└── proxy.ts          # Route proxy/middleware
```

## Testing
Playwright tests in `tests/e2e/full-audit.spec.ts`.
Screenshots saved to `test-results/audit-screenshots/`.
Always run full test suite after changes.
