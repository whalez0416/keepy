import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database.js";
import { SiteMember } from "../models/SiteMember.js";
import { AuthRequest } from "./auth.middleware.js";

export interface SiteAccessRequest extends AuthRequest {
    siteId?: string;
    siteMember?: SiteMember;
}

/**
 * Verify user has access to requested site
 * Extracts siteId from params or body
 */
export async function requireSiteAccess(
    req: SiteAccessRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const siteId = req.params.siteId || req.params.id || req.body.site_id;

        if (!siteId) {
            return res.status(400).json({ error: "Site ID required" });
        }

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        // SuperAdmins bypass site access checks
        if (req.user?.system_role === "superadmin") {
            req.siteId = siteId;
            return next();
        }

        // Check site membership
        const memberRepo = AppDataSource.getRepository(SiteMember);
        const membership = await memberRepo.findOne({
            where: {
                user: { id: userId },
                site: { id: siteId }
            },
            relations: ["user", "site"]
        });

        if (!membership) {
            return res.status(403).json({
                error: "Access denied: You are not a member of this site"
            });
        }

        req.siteId = siteId;
        req.siteMember = membership;
        next();
    } catch (error: any) {
        console.error("[RBAC] Site access check failed:", error.message);
        res.status(500).json({ error: "Access verification failed" });
    }
}

/**
 * Require specific role for site access
 */
export function requireSiteRole(requiredRole: "owner" | "staff" | "viewer") {
    return async (req: SiteAccessRequest, res: Response, next: NextFunction) => {
        const membership = req.siteMember;

        if (!membership) {
            return res.status(403).json({ error: "Site membership required" });
        }

        const roleHierarchy: Record<string, number> = { owner: 3, staff: 2, viewer: 1 };
        const userLevel = roleHierarchy[membership.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole];

        if (userLevel < requiredLevel) {
            return res.status(403).json({
                error: `Insufficient permissions: ${requiredRole} role required`
            });
        }

        next();
    };
}

/**
 * Require permission flag on site membership
 */
export function requirePermission(permission: "can_delete_spam" | "can_view_logs" | "can_manage_members") {
    return async (req: SiteAccessRequest, res: Response, next: NextFunction) => {
        const membership = req.siteMember;

        if (!membership) {
            return res.status(403).json({ error: "Site membership required" });
        }

        // SuperAdmins bypass permission checks
        if (req.user?.system_role === "superadmin") {
            return next();
        }

        if (!membership[permission]) {
            return res.status(403).json({
                error: `Permission denied: ${permission} required`
            });
        }

        next();
    };
}
