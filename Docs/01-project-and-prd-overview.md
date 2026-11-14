# DeskOps – Project and PRD Overview

## 1. What is DeskOps?
DeskOps is a Service Desk Platform with an SLA Engine. In Phase 1, the focus is the **Ticketing Core**: a requester can raise a maintenance/service ticket, the team can process it, and the system records the important steps.

The PRD describes a multi-tenant product. In simple words, multiple organisations can use the same application while each organisation's data remains separate.

## 2. What does PRD mean?
**PRD = Product Requirements Document.**

A PRD explains:
- what product the team must build;
- the problem the product should solve;
- which features are required;
- the quality, security and technical standards;
- how the work will be checked; and
- important milestones and deadlines.

The LogicVeda document `DeskOps-Phase-1-Requirements.pdf` is the Phase 1 PRD and is the main reference for the team.

## 3. Phase 1 functional requirements

| ID | Requirement | Meaning in simple words |
|---|---|---|
| FR-1.01 | Organisation model | An organisation is a tenant. Properties, units and residents belong under it. Technicians have skills and the properties they cover. |
| FR-1.02 | Ticket lifecycle | Tickets move through defined states: new, triaged, assigned, in progress, on hold, resolved and closed. Reopening is allowed within a configurable window. Invalid transitions must be rejected by the API. |
| FR-1.03 | Ticket history | Save each ticket state change as an event with the actor and timestamp. Build the ticket timeline from those events. |
| FR-1.04 | Attachments | Support image/PDF uploads using presigned URLs, enforce size and server-side file-type checks, and generate thumbnails using a worker. |
| FR-1.05 | Email to ticket | An inbound email webhook creates a ticket or adds a reply to an existing ticket using a reply token in the subject. A mock endpoint is allowed. |
| FR-1.06 | Real-time updates | Ticket changes should appear for other signed-in users without refreshing the page. |
| FR-1.07 | Comments | Support internal comments (staff only) and public comments (visible to the resident/requester). |
| FR-1.08 | Client-specific rule | Implement the additional rule assigned to the team's client and cover it with at least one automated test. |

## 4. Change request
**CR-1 – Merge duplicate tickets.** The duplicate ticket closes, and its comments and watchers move to the original ticket.

## 5. Important non-functional requirements

| ID | Area | What the system must do |
|---|---|---|
| NFR-01 | Tenant isolation | Every table carries `organisationId`; queries are scoped by middleware. A user from Organisation A must not access Organisation B's records. |
| NFR-02 | Access control | Maintain a role-by-action permission matrix in code and in the design document. Test allowed and denied access for protected routes. |
| NFR-03 | Data integrity | Concurrent requests must not corrupt data. The PRD calls for a test with 20 parallel requests at a critical write. |
| NFR-04 | API standard | Use `/api/v1`, Zod validation, consistent errors, cursor pagination, idempotency keys on create endpoints, and publish OpenAPI at `/docs`. |
| NFR-06 | Reliability | Jobs retry with backoff; failed jobs go to a dead-letter queue. Provide `/health` and `/ready`. |
| NFR-07 | Security | Hash passwords, rotate refresh tokens, use Helmet and CORS allow-list, validate uploaded files, and never commit secrets. |
| NFR-08 | Observability | Structured JSON logs with request IDs and Sentry on frontend/backend. |
| NFR-09 | Audit | Record who changed what and when for business-critical records. |
| NFR-10 | Testing | Target 70% service coverage; cover the main user journey with Playwright; run tests in CI. |
| NFR-11 | Documentation | Maintain the technical design document, ADRs, OpenAPI, runbook and release notes. |

## 6. Required technology standard
- Frontend: React 18, TypeScript, Vite, TanStack Query, React Hook Form, Zod, Tailwind CSS, Playwright.
- Backend: Node.js 22, TypeScript, Express or NestJS, layered routes/services/repositories, Zod, Swagger/OpenAPI.
- Data: PostgreSQL with Prisma migrations; Redis.
- Jobs and real-time: BullMQ and Socket.io.
- Files: S3-compatible storage such as Cloudflare R2 or AWS S3.
- Delivery: Docker, docker-compose, GitHub Actions and Render.
- Quality/operations: Vitest, Supertest, Playwright, k6, OWASP ZAP baseline scan, pino and Sentry.

## 7. Scope reminders
The PRD explicitly says maintenance-fee billing, visitor management and native mobile applications are out of scope for this project.

## 8. Source and interpretation
This overview is a simplified working summary of `DeskOps-Phase-1-Requirements.pdf` (LogicVeda, document ID `LV-WD-DESKOPS-P1`, version 1.0, issue date 12 Nov 2026). When there is a conflict, follow the latest formally issued PRD revision.
