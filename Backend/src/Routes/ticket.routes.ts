
import express from "express";
import { z } from "zod";
import prisma from "../db.js";
import authMiddleware from "../Middlewares/auth.middleware.js";
import tenantMiddleware from "../Middlewares/tenant.middleware.js";
import type { AuthRequest } from "../Middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

const createTicketSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    roomId: z.string().uuid()
});

// Create ticket
router.post("/", async (req: AuthRequest, res) => {
    try {
        const result = createTicketSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket details"
            });
        }

        const { title, description, roomId } = result.data;
        const organisationId = req.organisationId!;
        const membership = await prisma.membership.findUnique({
            where: {
                userId_organisationId: {
                    userId: req.user!.userId,
                    organisationId
                }
            }
        });

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this organisation"
            });
        }

        // Check that room belongs to the logged-in organisation
        const room = await prisma.room.findFirst({
            where: {
                id: roomId,
                organisationId
            }
        });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        const ticket = await prisma.ticket.create({
            data: {
                title,
                description,
                roomId,
                organisationId,
                createdById: req.user!.userId
            }
        });

        return res.status(201).json({
            success: true,
            message: "Ticket created successfully",
            ticket
        });

    } catch (error) {
        console.error("Create ticket error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create ticket"
        });
    }
});

// Get all tickets of current organisation
router.get("/", async (req: AuthRequest, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            where: {
                organisationId: req.organisationId!
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            success: true,
            tickets
        });

    } catch (error) {
        console.error("Get tickets error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch tickets"
        });
    }
});

// Get one ticket by ID
router.get("/:ticketId", async (req: AuthRequest, res) => {
    const ticketId = req.params.ticketId;
    if (typeof ticketId !== "string") {
        return res.status(400).json({
            success: false,
            message: "Invalid ticket ID"
        });
    }
    try {
        const ticket = await prisma.ticket.findFirst({
            where: {
                id: ticketId,
                organisationId: req.organisationId!
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        return res.status(200).json({
            success: true,
            ticket
        });

    } catch (error) {
        console.error("Get ticket error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch ticket"
        });
    }
});

export default router;
