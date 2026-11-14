# Roles and Permissions

## 1. Why do we need roles?
A role tells the application what a user is allowed to do. For example, a person who manages users may need different access from a person who only registers and tracks service requests.

The PRD requires a **permission matrix (role by action)** to be maintained in the code and design document (NFR-02). It does not give a complete list of application roles or prescribe the exact permissions for Admin and Staff.

## 2. Role meanings – proposed team design

These descriptions are a starting proposal for the team's permission design, not verbatim PRD requirements.

### Admin
An organisation-level manager who manages the organisation's setup and access.
- Manage organisation settings and users.
- Assign roles and permissions.
- View and manage tickets within the organisation, subject to the final permission rules.
- Review audit information.

### Staff
A day-to-day operations user, such as a receptionist or service-desk coordinator.
- Register a service request/ticket on behalf of a requester.
- View and update tickets they are permitted to access.
- Add internal staff comments.
- Track ticket progress and coordinate assignment, if permitted by the final matrix.

### Technician
A person who performs the assigned work.
- View tickets assigned to them.
- Update work progress and ticket status where allowed.
- Add work notes/comments according to the permission rules.
- Their skills and the properties they cover are part of the organisation model (FR-1.01).

### Resident / Requester
A person who raises a request and follows its progress.
- Create a request/ticket.
- View their own permitted tickets.
- Add public comments or replies where supported.
- Must not see internal staff-only comments.

## 3. Draft permission matrix – team must review

Legend: **A** = allowed in this proposal; **—** = not allowed in this proposal; **Review** = team/mentor must decide.

| Action | Admin | Staff | Technician | Resident/Requester |
|---|---:|---:|---:|---:|
| Manage organisation settings | A | — | — | — |
| Invite/manage users | A | — | — | — |
| Assign user roles | A | — | — | — |
| Create a ticket/request | A | A | Review | A |
| View all organisation tickets | A | Review | — | — |
| View own/assigned tickets | A | A | A | A (own only) |
| Assign/reassign a ticket | A | Review | — | — |
| Change ticket status | A | Review | A (assigned tickets only) | — |
| Add internal comment | A | A | A | — |
| Add public comment | A | A | Review | A (own ticket only) |
| View audit information | A | Review | — | — |
| Merge duplicate tickets | A | Review | — | — |

## 4. Rules that apply to every role
- A user must only access data belonging to their own organisation/tenant.
- Internal comments must not be visible to residents/requesters (FR-1.07).
- Access must be checked by the backend API; hiding a button in the frontend is not sufficient.
- Protected routes need tests for at least one permitted role and one denied role (NFR-02).
- Do not rely on role alone: also check organisation ownership and, where applicable, ticket assignment.

## 5. Decisions to confirm with the team/mentor
- Can Staff assign tickets, or can only Admin do this?
- Can Technicians create tickets, or only receive assigned tickets?
- Can Technicians add public comments, or only internal work notes?
- Can Staff see every ticket in their organisation, or only selected properties/tickets?
- Who is allowed to merge duplicate tickets?

Update the matrix after the team agrees. Do not describe this draft as a permission matrix mandated by the PRD; only the requirement to create and maintain a matrix is mandated.
