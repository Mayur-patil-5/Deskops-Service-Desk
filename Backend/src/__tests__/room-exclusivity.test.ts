import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import app from "../server.js";
import prisma from "../db.js";

const secret = process.env.JWT_SECRET!;

describe("Room Exclusivity Test", () => {
    const suffix = randomUUID();

    let organisation: any;
    let user: any;
    let room: any;
    let secondRoom: any;
    let token: string;

    beforeAll(async () => {
        organisation = await prisma.organisation.create({
            data: { name: `Room Test Org ${suffix}` }
        });

        user = await prisma.user.create({
            data: {
                name: "Room Test User",
                email: `room-${suffix}@test.com`,
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
                name: `Room One ${suffix}`,
                organisationId: organisation.id
            }
        });

        secondRoom = await prisma.room.create({
            data: {
                name: `Room Two ${suffix}`,
                organisationId: organisation.id
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
        if (organisation) {
            await prisma.ticketEvent.deleteMany({
                where: { organisationId: organisation.id }
            });

            await prisma.ticket.deleteMany({
                where: { organisationId: organisation.id }
            });

            await prisma.room.deleteMany({
                where: { organisationId: organisation.id }
            });

            await prisma.membership.deleteMany({
                where: { organisationId: organisation.id }
            });

            if (user) {
                await prisma.user.delete({
                    where: { id: user.id }
                });
            }

            await prisma.organisation.delete({
                where: { id: organisation.id }
            });
        }

        await prisma.$disconnect();
    });

    it("should reject a second active ticket in the same room", async () => {
        const firstResponse = await request(app)
            .post("/api/v1/tickets")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "First Room Ticket",
                description: "First active ticket",
                roomId: room.id
            });

        expect(firstResponse.status).toBe(201);

        const secondResponse = await request(app)
            .post("/api/v1/tickets")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Second Room Ticket",
                description: "Second active ticket",
                roomId: room.id
            });

        expect(secondResponse.status).toBe(409);
    });

    it("should allow an active ticket in a different room", async () => {
        const response = await request(app)
            .post("/api/v1/tickets")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Different Room Ticket",
                description: "Ticket in another room",
                roomId: secondRoom.id
            });

        expect(response.status).toBe(201);
    });
});