import { Request, Response } from "express";
import { AppDataSource } from "../config/database.js";
import { User } from "../models/User.js";
import { Site } from "../models/Site.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { sites, monitoringLogs } from "./monitoring.scheduler.js";

export class AdminController {
    /**
     * Get all users with their site counts
     */
    static async getAllUsers(req: AuthRequest, res: Response) {
        try {
            const userRepo = AppDataSource.getRepository(User);

            const users = await userRepo.find({
                select: ['id', 'email', 'name', 'phone', 'role', 'subscription_type', 'created_at'],
                order: { created_at: 'DESC' }
            });

            // Add site count for each user
            const usersWithStats = users.map(user => {
                const userSites = sites.filter(s => s.user_id === user.id);
                return {
                    ...user,
                    site_count: userSites.length,
                    active_sites: userSites.filter(s => s.is_active).length
                };
            });

            res.json({
                users: usersWithStats,
                total: users.length
            });
        } catch (error: any) {
            console.error('[Admin] Get all users error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get detailed info for a specific user
     */
    static async getUserDetails(req: AuthRequest, res: Response) {
        try {
            const { userId } = req.params;
            const userRepo = AppDataSource.getRepository(User);

            const user = await userRepo.findOne({
                where: { id: userId as string },
                select: ['id', 'email', 'name', 'phone', 'role', 'subscription_type', 'created_at', 'updated_at']
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Get user's sites
            const userSites = sites.filter(s => s.user_id === userId);

            // Get user's recent logs
            const userLogs = monitoringLogs
                .filter(log => userSites.some(site => site.id === log.site_id))
                .slice(0, 20); // Last 20 logs

            res.json({
                user,
                sites: userSites,
                recent_logs: userLogs,
                stats: {
                    total_sites: userSites.length,
                    active_sites: userSites.filter(s => s.is_active).length,
                    total_logs: userLogs.length
                }
            });
        } catch (error: any) {
            console.error('[Admin] Get user details error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get system statistics
     */
    static async getStats(req: AuthRequest, res: Response) {
        try {
            const userRepo = AppDataSource.getRepository(User);

            const totalUsers = await userRepo.count();
            const adminUsers = await userRepo.count({ where: { role: 'admin' } });

            // Count by subscription type
            const freeUsers = await userRepo.count({ where: { subscription_type: 'free' } });
            const basicUsers = await userRepo.count({ where: { subscription_type: 'basic' } });
            const proUsers = await userRepo.count({ where: { subscription_type: 'pro' } });
            const enterpriseUsers = await userRepo.count({ where: { subscription_type: 'enterprise' } });

            res.json({
                users: {
                    total: totalUsers,
                    admins: adminUsers,
                    regular: totalUsers - adminUsers
                },
                subscriptions: {
                    free: freeUsers,
                    basic: basicUsers,
                    pro: proUsers,
                    enterprise: enterpriseUsers
                },
                sites: {
                    total: sites.length,
                    active: sites.filter(s => s.is_active).length,
                    inactive: sites.filter(s => !s.is_active).length
                },
                logs: {
                    total: monitoringLogs.length
                }
            });
        } catch (error: any) {
            console.error('[Admin] Get stats error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Update user role or subscription
     */
    static async updateUser(req: AuthRequest, res: Response) {
        try {
            const { userId } = req.params;
            const { role, subscription_type } = req.body;

            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOneBy({ id: userId as string });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Update fields if provided
            if (role && ['admin', 'user'].includes(role)) {
                user.role = role;
            }

            if (subscription_type && ['free', 'basic', 'pro', 'enterprise'].includes(subscription_type)) {
                user.subscription_type = subscription_type;
            }

            await userRepo.save(user);

            res.json({
                message: 'User updated successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    subscription_type: user.subscription_type
                }
            });
        } catch (error: any) {
            console.error('[Admin] Update user error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}
