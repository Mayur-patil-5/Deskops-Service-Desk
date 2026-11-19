CREATE UNIQUE INDEX "Ticket_one_open_ticket_per_room"
ON "Ticket" ("roomId")
WHERE "status" IN ('OPEN', 'IN_PROGRESS');