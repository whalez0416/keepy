import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export interface AuthRequest extends Request {
    user?: any;
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const user = await AuthService.verifyToken(token);

        req.user = user;
        next();
    } catch (error: any) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
