# Admin / Superadmin mobile

Source reference: E:/Igen/3S-Gym/frontend admin routes/components and backend controllers/validators.

## Entry and authorization

ADMIN and SUPER_ADMIN land on `/admin` after login or session restoration. The admin layout rejects unauthenticated and non-admin users; the admin-account section requires SUPER_ADMIN, including direct navigation. Account edit/delete rules mirror web and the backend enforces authorization. PT/customer navigation and the existing training workspace remain available.

## Available on mobile

- Dashboard: API KPI, customer/package statistics, PT workload, alerts, PT/status/date filters.
- PT, customer accounts and admin accounts (superadmin): paginated search, filters, create/edit/delete.
- Customer profiles, individual PT transfers, transfer history and package templates.
- Batch transfers: searchable paginated multi-selection retained across pages, PT selection, reason, review and explicit confirmation. Results use the actual API count.
- Credit: packages, balance adjustments, pricing, AI policies, payment orders, ledger, usage and shortfalls.
- Knowledge: create/edit/delete, search, publish/unpublish and standard-library seeding. Seeding confirms immediate publication and preserves matching existing titles.
- Food-image library: server summary, search/source/category filters, pagination, preview, device upload, image replacement, editable metadata/macros/keywords, AI generation/regeneration and deletion. Upload supports JPG/PNG/WebP up to 10 MB, including multipart PATCH for replacement.
- Feature configuration: global enable/disable, role permissions and searchable multi-selection of pilot accounts. The editor preserves all stored pilots (including users outside the current page) and checks whether the configuration changed before saving.
- Native bottom sheets, fixed multi-selection footer, safe-area spacing, loading/error/empty states, mutation locks and destructive-action confirmations.

## Backend dependency

Changes in E:/Igen/3S-Gym add `GET /api/features` with ADMIN authorization (including inherited SUPER_ADMIN permission). It returns every known feature's stored `enabled`, `roles` and `pilotUserIds`; missing configurations are disabled with empty permissions, matching existing effective behavior. `/api/features/me` is unchanged.

Deploy/restart the backend with this endpoint together with mobile. Do not substitute effective `/me` booleans for stored permissions. Existing image, transfer and knowledge endpoints are reused unchanged. No production data is created by verification.

## Verification

- Mobile: `npm run typecheck`, ESLint on changed files with zero warnings, `npm test` (45 tests).
- Backend: `npx vitest run --config vitest.config.ts backend/tests/featureAdminApi.test.ts` (3 tests against temporary MongoDB), `npm run typecheck:backend`, Oxlint on changed files.
- Backend tests follow this repository's local-only `backend/tests/` convention; that directory is ignored by Git.
- No Android/iOS device preview or real AI generation/upload has been performed. Device QA should cover camera-roll selection, keyboard/nested sheets, long names, network interruptions, batch selection across pages and authorization with real test accounts.

## Feature configuration correction

Both mobile AdminFeatures and web FeatureFlagsView now read GET /api/features exclusively. Neither converts /api/features/me into editable configuration. Failed loads show an error; mobile counters show an unavailable marker instead of fabricated zero counts. Web toggles preserve pilotUserIds.

Deploy these backend source files from 3S-Gym together: backend/routes/features.ts, backend/controllers/featureController.ts, backend/services/featureFlagService.ts. GET /api/features is restricted to ADMIN/SUPER_ADMIN and returns stored enabled, roles, pilotUserIds for all known feature keys. Existing /api/features/me remains the effective permissions endpoint for feature gates.

Also deploy frontend/src/components/admin/FeatureFlagsView.tsx and frontend/src/components/ui/FeatureFlagModal.tsx to correct the web administration screen. No database migration is required. Build with npm run build and npm run build:backend using the existing deployment process. No production deployment was performed by this change.