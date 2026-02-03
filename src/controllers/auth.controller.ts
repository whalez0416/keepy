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
                    name: user.name,
                    role: user.role
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
                    name: user.name,
                    role: user.role
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
                    phone: user.phone,
                    role: user.role
                }
            });
        } catch (error: any) {
            console.error('[Auth] Get user error:', error.message);
            res.status(500).json({ error: 'Failed to get user info' });
        }
    }

    /**
     * Update user profile
     */
    static async updateProfile(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.id;
            const { name, phone, password } = req.body;

            const updatedUser = await AuthService.updateProfile(userId, { name, phone, password });

            res.json({
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    name: updatedUser.name,
                    phone: updatedUser.phone,
                    role: updatedUser.role
                }
            });
        } catch (error: any) {
            console.error('[Auth] Update profile error:', error.message);
            res.status(400).json({ error: error.message });
        }
    }
}
