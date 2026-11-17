
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";

const roleMiddleware = (...allowedRoles: string[]) => {
    return (
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

        // Check user's role
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to access this resource"
            });
        }

        next();
    };
};

export default roleMiddleware;
