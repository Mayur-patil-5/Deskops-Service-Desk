import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import app from "../server.js";
import prisma from "../db.js";

const secret = process.env.JWT_SECRET!;

describe("Assignment Concurrency Test", () => {
    const suffix = randomUUID();

    let organisation: any;
    let user: any;
    let assignee: any;
    let room: any;
    let ticket: any;
    let token: string;

    beforeAll(async () => {
        organisation = await prisma.organisation.create({
            data: { name: `Assignment Org ${suffix}` }
        });

        user = await prisma.user.create({
            data: {
                name: "Assignment Admin",
                email: `admin-${suffix}@test.com`,
                passwordHash: "test-password"
            }
        });

        assignee = await prisma.user.create({
            data: {
                name: "Assignment Technician",
                email: `tech-${suffix}@test.com`,
                passwordHash: "test-password"
            }
        });

        await prisma.membership.createMany({
            data: [
                {
                    userId: user.id,
                    organisationId: organisation.id,
                    role: "ADMIN"
                },
                {
                    userId: assignee.id,
                    organisationId: organisation.id,
                    role: "TECHNICIAN"
                }
            ]
        });

        room = await prisma.room.create({
            data: {
                name: `Assignment Room ${suffix}`,
                organisationId: organisation.id
            }
        });

        ticket = await prisma.ticket.create({
            data: {
                title: "Concurrent Assignment Ticket",
                description: "Testing 20 simultaneous assignment requests",
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

        if (organisation && user && assignee) {
            await prisma.membership.deleteMany({
                where: {
                    organisationId: organisation.id
                }
            });

            await prisma.user.deleteMany({
                where: {
                    id: { in: [user.id, assignee.id] }
                }
            });

            await prisma.organisation.delete({
                where: { id: organisation.id }
            });
        }

        await prisma.$disconnect();
    });

    it("should allow exactly one success from 20 parallel assignment requests", async () => {
        const requests = Array.from({ length: 20 }, () =>
            request(app)
                .patch(`/api/v1/assignments/${ticket.id}/assign`)
                .set("Authorization", `Bearer ${token}`)
                .send({ assignedToId: assignee.id })
        );

        const responses = await Promise.all(requests);

        const successfulRequests = responses.filter(
            response => response.status === 200
        );

        const rejectedRequests = responses.filter(
            response => response.status === 409
        );

        expect(successfulRequests).toHaveLength(1);
        expect(rejectedRequests).toHaveLength(19);

        const finalTicket = await prisma.ticket.findUnique({
            where: { id: ticket.id }
        });

        expect(finalTicket?.assignedToId).toBe(assignee.id);
    });
});