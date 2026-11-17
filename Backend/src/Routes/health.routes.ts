import express from "express";
import prisma from "../db.js";
import authMiddleware from "../Middlewares/auth.middleware.js";
import tenantMiddleware from "../Middlewares/tenant.middleware.js";
import type { AuthRequest } from "../Middlewares/auth.middleware.js";

const router = express.Router();

router.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "DeskOps API is healthy"
    });
});

// Test Neon database connection
router.get("/db-test", async (req, res) => {
    try {
        const count = await prisma.organisation.count();

        res.status(200).json({
            success: true,
            message: "Database connected successfully!",
            organisationCount: count
        });

    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// Get current organisation details
router.get(
    "/my-organisation",
    authMiddleware,
    tenantMiddleware,
    async (req: AuthRequest, res) => {
        try {
            const organisation = await prisma.organisation.findUnique({
                where: {
                    id: req.organisationId!
                },
                select: {
                    id: true,
                    name: true,
                    createdAt: true
                }
            });

            if (!organisation) {
                return res.status(404).json({
                    success: false,
                    message: "Organisation not found"
                });
            }

            return res.status(200).json({
                success: true,
                organisation
            });

        } catch (error) {
            console.error("Organisation error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch organisation"
            });
        }
    }
);

export default router;