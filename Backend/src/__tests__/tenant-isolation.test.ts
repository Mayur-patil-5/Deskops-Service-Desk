
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import app from "../server.js";
import prisma from "../db.js";

const secret = process.env.JWT_SECRET!;

describe("Tenant Isolation API Test", () => {
    const suffix = randomUUID();

    let orgA: any;
    let orgB: any;
    let userA: any;
    let userB: any;
    let userC: any;
    let roomA: any;
    let ticketA: any;
    let tokenB: string;
    let tokenC: string;

    beforeAll(async () => {
        orgA = await prisma.organisation.create({
            data: { name: `Test Org A ${suffix}` }
        });

        orgB = await prisma.organisation.create({
            data: { name: `Test Org B ${suffix}` }
        });

        userA = await prisma.user.create({
            data: {
                name: "Test User A",
                email: `usera-${suffix}@test.com`,
                passwordHash: "test-password"
            }
        });

        userB = await prisma.user.create({
            data: {
                name: "Test User B",
                email: `userb-${suffix}@test.com`,
                passwordHash: "test-password"
            }
        });

        userC = await prisma.user.create({
            data: {
                name: "Test User C",
                email: `userc-${suffix}@test.com`,
                passwordHash: "test-password"
            }
        });

        await prisma.membership.createMany({
            data: [
                {
                    userId: userA.id,
                    organisationId: orgA.id,
                    role: "ADMIN"
                },
                {
                    userId: userB.id,
                    organisationId: orgB.id,
                    role: "ADMIN"
                }
            ]
        });

        roomA = await prisma.room.create({
            data: {
                name: "Test Room A",
                organisationId: orgA.id
            }
        });

        ticketA = await prisma.ticket.create({
            data: {
                title: "Test Ticket A",
                description: "Tenant isolation test",
                organisationId: orgA.id,
                roomId: roomA.id,
                createdById: userA.id
            }
        });

        tokenB = jwt.sign(
            {
                userId: userB.id,
                organisationId: orgB.id,
                role: "ADMIN"
            },
            secret
        );
        tokenC = jwt.sign(
            {
                userId: userC.id,
                organisationId: orgA.id,
                role: "ADMIN"
            },
            secret
        );
    });

    afterAll(async () => {
        if (ticketA) {
            await prisma.ticket.deleteMany({
                where: { id: ticketA.id }
            });
        }

        if (roomA) {
            await prisma.room.deleteMany({
                where: { id: roomA.id }
            });
        }

        if (userA && userB) {
            await prisma.membership.deleteMany({
                where: {
                    userId: { in: [userA.id, userB.id] }
                }
            });
        }

        if (userA && userB && userC) {
            await prisma.user.deleteMany({
                where: {
                    id: { in: [userA.id, userB.id, userC.id] }
                }
            });
        }

        if (orgA && orgB) {
            await prisma.organisation.deleteMany({
                where: {
                    id: { in: [orgA.id, orgB.id] }
                }
            });
        }

        await prisma.$disconnect();
    });

    it("should return 404 when Org B accesses Org A ticket", async () => {
        const response = await request(app)
            .get(`/api/v1/tickets/${ticketA.id}`)
            .set("Authorization", `Bearer ${tokenB}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Ticket not found");
    });
    it("should reject ticket creation by a non-member", async () => {
        const response = await request(app)
            .post("/api/v1/tickets")
            .set("Authorization", `Bearer ${tokenC}`)
            .send({
                title: "Unauthorized Ticket",
                description: "User is not a member",
                roomId: roomA.id
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
            "You are not a member of this organisation"
        );
    });
});
