
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthPayload {
    userId: string;
    organisationId: string;
    role: string;
}

export interface AuthRequest extends Request {
    user?: AuthPayload;
    organisationId?: string;
}

const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Token missing."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Invalid token."
            });
        }
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not configured");
        }

        const decoded = jwt.verify(token, jwtSecret);

        if (typeof decoded === "string" ||
            !("userId" in decoded) ||
            !("organisationId" in decoded) ||
            !("role" in decoded)) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload"
            });
        }

        req.user = {
            userId: decoded.userId as string,
            organisationId: decoded.organisationId as string,
            role: decoded.role as string
        };

        req.user = {
            userId: decoded.userId as string,
            organisationId: decoded.organisationId as string,
            role: decoded.role as string
        };

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

export default authMiddleware;
