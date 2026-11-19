
import express from "express";
import { z } from "zod";
import prisma from "../db.js";
import authMiddleware from "../Middlewares/auth.middleware.js";
import tenantMiddleware from "../Middlewares/tenant.middleware.js";
import type { AuthRequest } from "../Middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

// -------------------- VALIDATION SCHEMAS --------------------

const createTicketSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    roomId: z.string().uuid()
});

const updateStatusSchema = z.object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
});

// -------------------- ALLOWED STATUS TRANSITIONS --------------------

const allowedTransitions: Record<string, string[]> = {
    OPEN: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED"],
    RESOLVED: ["CLOSED"],
    CLOSED: []
};

// -------------------- CREATE TICKET --------------------

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

    } catch (error: any) {
        console.error("Create ticket error:", error);

        // Handle duplicate active ticket in the same room
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "This room already has an active ticket"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create ticket"
        });
    }
});

// -------------------- UPDATE TICKET STATUS --------------------

router.patch("/:ticketId/status", async (req: AuthRequest, res) => {
    try {
        const ticketId = req.params.ticketId;

        if (typeof ticketId !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID"
            });
        }

        const result = updateStatusSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket status"
            });
        }

        const newStatus = result.data.status;
        const organisationId = req.organisationId!;
        const actorId = req.user!.userId;

        const membership = await prisma.membership.findUnique({
            where: {
                userId_organisationId: {
                    userId: actorId,
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

        const ticket = await prisma.ticket.findFirst({
            where: {
                id: ticketId,
                organisationId
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const currentStatus = ticket.status;

        if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: ${currentStatus} to ${newStatus}`
            });
        }

        const updatedTicket = await prisma.$transaction(async (tx) => {

            // Update only if the status has not changed meanwhile
            const updated = await tx.ticket.updateMany({
                where: {
                    id: ticketId,
                    organisationId,
                    status: currentStatus
                },
                data: {
                    status: newStatus
                }
            });

            if (updated.count !== 1) {
                throw new Error("STATUS_CONFLICT");
            }

            // Store status transition history
            await tx.ticketEvent.create({
                data: {
                    ticketId,
                    organisationId,
                    fromStatus: currentStatus,
                    toStatus: newStatus,
                    actorId
                }
            });

            return tx.ticket.findFirst({
                where: {
                    id: ticketId,
                    organisationId
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Ticket status updated successfully",
            ticket: updatedTicket
        });

    } catch (error) {

        if (error instanceof Error && error.message === "STATUS_CONFLICT") {
            return res.status(409).json({
                success: false,
                message: "Ticket status was already changed. Please refresh."
            });
        }

        console.error("Update ticket status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update ticket status"
        });
    }
});

// -------------------- GET ALL TICKETS --------------------

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

// -------------------- GET ONE TICKET --------------------

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
            },
            include: {
                events: {
                    orderBy: {
                        createdAt: "asc"
                    }
                }
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
