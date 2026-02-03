import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";

/**
 * Middleware to check if user has admin role
 * Must be used after requireAuth middleware
 */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}
