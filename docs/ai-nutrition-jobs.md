# AI nutrition generation

Deploy backend and updated mobile/web together. Older clients can still use the synchronous POST /api/content-drafts/nutrition, but remain subject to proxy timeouts. Updated clients exclusively use:

- POST /api/content-drafts/nutrition/jobs: customerId, request, optional planId and durationDays (1–31), idempotencyKey. Returns HTTP 202 and job id/status immediately.
- GET /api/content-drafts/nutrition/jobs/:id: owner-only status and result/error. PT authentication and NUTRITION_AI feature are required on both endpoints.

Jobs are persisted in MongoDB, claimed atomically, and processed by the backend server worker. Pending jobs are picked up at startup. Interrupted PROCESSING jobs older than two hours become FAILED rather than being automatically rerun and billed again. Inspect saved nutrition plans after a server interruption. Job history expires after seven days.

Clients persist the request key by user and input, poll every 2.5 seconds, and keep the key on network errors. Retry the same request to resume tracking. They stop polling after 30 minutes while the server continues. A definitive failure clears the client key; retry then starts a new job. Completed jobs return a saved DRAFT plan; the mobile save action updates that plan rather than creating a duplicate.

Generation uses batches of at most seven days, each billed through the existing AI credit flow. The final partial week is generated with the exact remaining day count. All batches must contain the expected days and nonempty meals before a plan is saved; no partial plan is silently presented as complete. Long requests may involve several provider calls. No real paid AI calls were made during automated verification.

Request logs now mark unfinished response closures as statusCode 499, aborted=true, responseCompleted=false; this is a logging classification, not a response sent to the client.

Verification: TypeScript/mobile ESLint, backend/web Oxlint and builds, backend nutritionGenerationJob.test.ts + requestCloseLogging.test.ts (mocked AI, temporary MongoDB), mobile nutritionJobs.test.cjs (lost POST response, polling errors, retry identity). Device and production-proxy verification still required.