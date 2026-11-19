import express from "express";
import { z } from "zod";
import prisma from "../db.js";
import authMiddleware from "../Middlewares/auth.middleware.js";
import tenantMiddleware from "../Middlewares/tenant.middleware.js";
import type { AuthRequest } from "../Middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

const assignmentSchema = z.object({
    assignedToId: z.string().uuid()
});

// ASSIGN TICKET
router.patch("/:ticketId/assign", async (req: AuthRequest, res) => {
    try {
        const ticketId = req.params.ticketId;
        const result = assignmentSchema.safeParse(req.body);

        if (typeof ticketId !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID"
            });
        }

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid assignee details"
            });
        }

        const organisationId = req.organisationId!;
        const assignedToId = result.data.assignedToId;

        // Check current user membership
        const currentMembership = await prisma.membership.findUnique({
            where: {
                userId_organisationId: {
                    userId: req.user!.userId,
                    organisationId
                }
            }
        });

        if (!currentMembership) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this organisation"
            });
        }

        // Check whether ticket belongs to this organisation
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

        // Check whether assignee belongs to this organisation
        const assigneeMembership = await prisma.membership.findUnique({
            where: {
                userId_organisationId: {
                    userId: assignedToId,
                    organisationId
                }
            }
        });

        if (!assigneeMembership) {
            return res.status(400).json({
                success: false,
                message: "Assignee is not a member of this organisation"
            });
        }

        // Atomic assignment: only one request can assign the ticket
        const updated = await prisma.ticket.updateMany({
            where: {
                id: ticketId,
                organisationId,
                assignedToId: null
            },
            data: {
                assignedToId
            }
        });

        if (updated.count !== 1) {
            return res.status(409).json({
                success: false,
                message: "Ticket is already assigned"
            });
        }

        const updatedTicket = await prisma.ticket.findFirst({
            where: {
                id: ticketId,
                organisationId
            }
        });

        return res.status(200).json({
            success: true,
            message: "Ticket assigned successfully",
            ticket: updatedTicket
        });

    } catch (error) {
        console.error("Assignment error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to assign ticket"
        });
    }
});

export default router;