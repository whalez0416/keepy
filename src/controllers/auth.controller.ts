import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export class AuthController {
    /**
     * Register new user
     */
    static async register(req: Request, res: Response) {
        try {
            const { email, password, name, phone } = req.body;

            if (!email || !password || !name) {
                return res.status(400).json({ error: 'Email, password, and name are required' });
            }

            const { user, token } = await AuthService.register(email, password, name, phone);

            res.json({
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                },
                token
            });
        } catch (error: any) {
            console.error('[Auth] Registration error:', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Login user
     */
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            const { user, token } = await AuthService.login(email, password);

            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                },
                token
            });
        } catch (error: any) {
            console.error('[Auth] Login error:', error.message);
            res.status(401).json({ error: error.message });
        }
    }

    /**
     * Get current user
     */
    static async getCurrentUser(req: AuthRequest, res: Response) {
        try {
            const user = req.user;

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone
                }
            });
        } catch (error: any) {
            console.error('[Auth] Get user error:', error.message);
            res.status(500).json({ error: 'Failed to get user info' });
        }
    }
}
