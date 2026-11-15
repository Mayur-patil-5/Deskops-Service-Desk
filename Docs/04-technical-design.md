
# DeskOps – Technical Design Document

## 1. Organisation Structure

DeskOps follows a multi-tenant architecture.

A tenant represents one organisation (dental clinic chain). Multiple organisations can use the same DeskOps platform, but their data must remain separate.

### 1.1 Hierarchy

- Organisation (Tenant)
  - Branches (Clinic locations)
    - Rooms / Dental Chairs
      - Tickets

### 1.2 Users

Each organisation has its own users, such as Admin, Staff and Technicians.

Technicians can have assigned skills and the branches they cover.

### 1.3 Tenant Isolation

Every organisation's data is isolated using its organisationId.

A user from Dental Clinic A must not be able to access tickets or other records belonging to Dental Clinic B.

All database queries must be scoped to the authenticated user's organisation.

### 1.4 Client-Specific Rule

Each ticket is linked to a specific dental chair or room.

Only one open ticket is allowed per dental chair or room at a time.


## 2. Ticket State Machine

Every ticket follows a defined lifecycle. The API validates each status transition and rejects invalid transitions.

### 2.1 Ticket Statuses

1. New – Ticket has been created.
2. Triaged – Ticket has been reviewed and categorised.
3. Assigned – A technician has been assigned.
4. In Progress – Work has started.
5. On Hold – Work is temporarily paused.
6. Resolved – The reported issue has been fixed.
7. Closed – The ticket has been officially closed.

### 2.2 Reopening

A resolved or closed ticket can be reopened within a configurable time window.

### 2.3 Transition Validation

The system must reject illegal status transitions through API validation.

For example, a ticket cannot move directly from New to In Progress without following the required workflow.


## 3. Event History

DeskOps maintains a history of every ticket status transition.

Whenever a ticket changes its status, the system creates an event record.

### 3.1 Event Details

Each event stores:

- ticketId – ID of the related ticket.
- action – Action performed.
- oldStatus – Previous ticket status.
- newStatus – Updated ticket status.
- actorId – ID of the user who performed the action.
- timestamp – Date and time of the action.

### 3.2 Ticket Timeline

The system uses event records to display the complete ticket timeline.

For example:

1. Ticket created by Staff.
2. Technician assigned by Admin.
3. Work started by Technician.
4. Ticket resolved by Technician.

### 3.3 Purpose

- Track every important ticket activity.
- Identify who performed an action.
- Know when a status was changed.
- Maintain transparency and accountability.
