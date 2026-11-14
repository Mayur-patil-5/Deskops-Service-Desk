# Dental Clinic – Client-Specific Rule

## 1. Requirement
The team's assigned client is a Dental Clinic Chain. Based on the client-rule information shared in the team workspace, tickets must be linked to a specific dental chair/room, and only one open ticket may exist for a chair/room at a time.

This is the team's additional client-specific requirement under FR-1.08. The exact wording in the LogicVeda Team Workspace should be treated as authoritative if it differs from this summary.

## 2. Simple example
- Chair/Room 1 has an open ticket: `TICKET-101`.
- A user tries to create another open ticket for Chair/Room 1.
- The system rejects the second open ticket (or directs the user to the existing ticket, depending on the final UX decision).
- After `TICKET-101` is no longer open, a new ticket for Chair/Room 1 may be created.

## 3. Suggested data-model impact
A ticket should reference the relevant chair/room, for example through a `chairRoomId` foreign key. The chair/room record should belong to the correct clinic/organisation.

The team must define which ticket statuses count as **open**. Do not assume this list without agreeing it in the design document. The PRD's lifecycle includes: new, triaged, assigned, in progress, on hold, resolved and closed.

## 4. Suggested validation behaviour
When creating a ticket:
1. Confirm the chair/room exists.
2. Confirm it belongs to the same organisation/clinic as the signed-in user.
3. Check whether that chair/room already has a ticket in an agreed open status.
4. If one exists, reject the duplicate-open-ticket request with a clear API error (or use the agreed existing-ticket flow).
5. Protect the check with a database-level strategy/transaction so two simultaneous requests cannot create two open tickets.

## 5. Minimum automated tests
- A chair/room can have one open ticket.
- Creating a second open ticket for the same chair/room is blocked.
- A different chair/room can have its own open ticket.
- A new ticket can be created after the earlier ticket reaches a status defined as non-open.
- A user cannot link a ticket to a chair/room belonging to another organisation.
- Two simultaneous create requests for the same chair/room do not create two open tickets.

FR-1.08 requires at least one automated test for the assigned client rule. The additional tests above are recommended coverage.

## 6. Decisions to confirm
- Which statuses count as open?
- When a user tries to create a second open ticket, should the UI show the existing ticket or simply show a validation error?
- Is the chair/room unique within a clinic, a branch/property, or the whole organisation?
- Can a chair/room be deactivated while it has an open ticket?
