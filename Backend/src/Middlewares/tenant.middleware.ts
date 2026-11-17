
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";

const tenantMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    // Check authentication
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    // Get organisation ID from authenticated user
    const organisationId = req.user.organisationId;

    if (!organisationId) {
        return res.status(403).json({
            success: false,
            message: "Organisation access denied"
        });
    }

    // Attach tenant ID to request
    req.organisationId = organisationId;

    next();
};

export default tenantMiddleware;
