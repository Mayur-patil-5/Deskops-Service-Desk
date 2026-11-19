import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import app from "../server.js";
import prisma from "../db.js";

const secret = process.env.JWT_SECRET!;

describe("Ticket State Machine API Test", () => {
    const suffix = randomUUID();

    let organisation: any;
    let user: any;
    let room: any;
    let ticket: any;
    let token: string;

    beforeAll(async () => {
        organisation = await prisma.organisation.create({
            data: { name: `State Test Org ${suffix}` }
        });

        user = await prisma.user.create({
            data: {
                name: "State Test User",
                email: `state-${suffix}@test.com`,
                passwordHash: "test-password"
            }
        });

        await prisma.membership.create({
            data: {
                userId: user.id,
                organisationId: organisation.id,
                role: "ADMIN"
            }
        });

        room = await prisma.room.create({
            data: {
                name: `State Test Room ${suffix}`,
                organisationId: organisation.id
            }
        });

        ticket = await prisma.ticket.create({
            data: {
                title: "State Machine Test Ticket",
                description: "Testing ticket status transitions",
                organisationId: organisation.id,
                roomId: room.id,
                createdById: user.id
            }
        });

        token = jwt.sign(
            {
                userId: user.id,
                organisationId: organisation.id,
                role: "ADMIN"
            },
            secret
        );
    });

    afterAll(async () => {
        if (ticket) {
            await prisma.ticketEvent.deleteMany({
                where: { ticketId: ticket.id }
            });

            await prisma.ticket.deleteMany({
                where: { id: ticket.id }
            });
        }

        if (room) {
            await prisma.room.deleteMany({
                where: { id: room.id }
            });
        }

        if (user) {
            await prisma.membership.deleteMany({
                where: { userId: user.id }
            });

            await prisma.user.deleteMany({
                where: { id: user.id }
            });
        }

        if (organisation) {
            await prisma.organisation.deleteMany({
                where: { id: organisation.id }
            });
        }

        await prisma.$disconnect();
    });

    it("should allow OPEN to IN_PROGRESS transition", async () => {
        const response = await request(app)
            .patch(`/api/v1/tickets/${ticket.id}/status`)
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "IN_PROGRESS" });

        expect(response.status).toBe(200);
        expect(response.body.ticket.status).toBe("IN_PROGRESS");
    });

    it("should reject an illegal transition", async () => {
        const response = await request(app)
            .patch(`/api/v1/tickets/${ticket.id}/status`)
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "CLOSED" });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("Invalid status transition");
    });

    it("should create an event with actor and transition details", async () => {
        const event = await prisma.ticketEvent.findFirst({
            where: { ticketId: ticket.id }
        });

        expect(event).not.toBeNull();
        expect(event?.fromStatus).toBe("OPEN");
        expect(event?.toStatus).toBe("IN_PROGRESS");
        expect(event?.actorId).toBe(user.id);
        expect(event?.createdAt).toBeInstanceOf(Date);
    });
    it("should allow IN_PROGRESS to RESOLVED transition", async () => {
        const response = await request(app)
            .patch(`/api/v1/tickets/${ticket.id}/status`)
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "RESOLVED" });

        expect(response.status).toBe(200);
        expect(response.body.ticket.status).toBe("RESOLVED");
    });
    it("should allow RESOLVED to CLOSED transition", async () => {
        const response = await request(app)
            .patch(`/api/v1/tickets/${ticket.id}/status`)
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "CLOSED" });

        expect(response.status).toBe(200);
        expect(response.body.ticket.status).toBe("CLOSED");
    });
    it("should return ticket with complete status history", async () => {
        const response = await request(app)
            .get(`/api/v1/tickets/${ticket.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.ticket.events).toHaveLength(3);

        expect(response.body.ticket.events[0].fromStatus).toBe("OPEN");
        expect(response.body.ticket.events[0].toStatus).toBe("IN_PROGRESS");

        expect(response.body.ticket.events[1].fromStatus).toBe("IN_PROGRESS");
        expect(response.body.ticket.events[1].toStatus).toBe("RESOLVED");

        expect(response.body.ticket.events[2].fromStatus).toBe("RESOLVED");
        expect(response.body.ticket.events[2].toStatus).toBe("CLOSED");
    });
    it("should reject transition from CLOSED to IN_PROGRESS", async () => {
        const response = await request(app)
            .patch(`/api/v1/tickets/${ticket.id}/status`)
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "IN_PROGRESS" });

        expect(response.status).toBe(400);
    });
});