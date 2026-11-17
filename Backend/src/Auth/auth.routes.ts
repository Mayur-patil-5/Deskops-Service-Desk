
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../db.js";
import authMiddleware from "../Middlewares/auth.middleware.js";
import type { AuthRequest } from "../Middlewares/auth.middleware.js";
import { authLimiter } from "../Middlewares/rateLimit.middleware.js";
import tenantMiddleware from "../Middlewares/tenant.middleware.js";
import roleMiddleware from "../Middlewares/role.middleware.js";

const router = express.Router();

// 1. Validate registration input
const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    organisationName: z.string().min(2)
});

// 2. Registration API
router.post("/register", authLimiter, async (req, res) => {
    try {
        // Validate user input
        const result = registerSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid input",
                errors: result.error.issues
            });
        }

        const { name, email, password, organisationName } = result.data;

        // Convert email to lowercase
        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create organisation, user and membership together
        const newUser = await prisma.$transaction(async (tx) => {

            const organisation = await tx.organisation.create({
                data: {
                    name: organisationName
                }
            });

            const user = await tx.user.create({
                data: {
                    name,
                    email: normalizedEmail,
                    passwordHash
                }
            });

            await tx.membership.create({
                data: {
                    userId: user.id,
                    organisationId: organisation.id,
                    role: "ADMIN"
                }
            });

            return {
                userId: user.id,
                organisationId: organisation.id
            };
        });

        // Check JWT secret
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not configured");
        }

        // Generate login token
        const token = jwt.sign(
            {
                userId: newUser.userId,
                organisationId: newUser.organisationId,
                role: "ADMIN"
            },
            jwtSecret,
            { expiresIn: "1d" }
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: newUser.userId,
                organisationId: newUser.organisationId,
                role: "ADMIN"
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
});

// Protected profile route
router.get("/me", authMiddleware, (req: AuthRequest, res) => {
    return res.status(200).json({
        success: true,
        message: "You are authenticated!",
        user: req.user
    });
});

// Admin-only protected route
router.get(
    "/admin-dashboard",
    authMiddleware,
    tenantMiddleware,
    roleMiddleware("ADMIN"),
    (req: AuthRequest, res) => {
        return res.status(200).json({
            success: true,
            message: "Welcome to Admin Dashboard",
            organisationId: req.organisationId,
            user: req.user
        });
    }
);

export default router;


// Login input validation
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

// Login API
router.post("/login", authLimiter, async (req, res) => {
    try {
        // Validate input
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password format"
            });
        }

        const { email, password } = result.data;

        // Find user by email
        const user = await prisma.user.findUnique({
            where: {
                email: email.trim().toLowerCase()
            },
            include: {
                memberships: true
            }
        });

        // Check user and password
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Get user's organisation membership
        const membership = user.memberships[0];

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "No organisation membership found"
            });
        }

        // Check JWT secret
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not configured");
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                organisationId: membership.organisationId,
                role: membership.role
            },
            jwtSecret,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                organisationId: membership.organisationId,
                role: membership.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
});

