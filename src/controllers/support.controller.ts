import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { AppDataSource } from "../config/database.js";
import { SupportTicket, TicketStatus } from "../models/SupportTicket.js";

export class SupportController {
    // User: Create new support ticket
    static async createTicket(req: AuthRequest, res: Response) {
        try {
            const { subject, message } = req.body;

            if (!subject || !message) {
                return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
            }

            const ticketRepo = AppDataSource.getRepository(SupportTicket);
            const ticket = ticketRepo.create({
                subject,
                message,
                user: req.user,
                is_read: false
            });

            await ticketRepo.save(ticket);

            res.status(201).json({
                success: true,
                message: '문의가 등록되었습니다.',
                ticket_id: ticket.id
            });
        } catch (error: any) {
            console.error('[SupportController] createTicket error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // User: Get my tickets
    static async getMyTickets(req: AuthRequest, res: Response) {
        try {
            const ticketRepo = AppDataSource.getRepository(SupportTicket);
            const tickets = await ticketRepo.find({
                where: { user: { id: req.user.id } },
                order: { created_at: "DESC" }
            });

            res.json({ tickets });
        } catch (error: any) {
            console.error('[SupportController] getMyTickets error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Admin: Get all tickets
    static async getAllTickets(req: AuthRequest, res: Response) {
        try {
            const { status, unread_only } = req.query;

            const ticketRepo = AppDataSource.getRepository(SupportTicket);
            const queryBuilder = ticketRepo.createQueryBuilder("ticket")
                .leftJoinAndSelect("ticket.user", "user")
                .orderBy("ticket.created_at", "DESC");

            if (status) {
                queryBuilder.andWhere("ticket.status = :status", { status });
            }

            if (unread_only === 'true') {
                queryBuilder.andWhere("ticket.is_read = :isRead", { isRead: false });
            }

            const tickets = await queryBuilder.getMany();

            // Get unread count
            const unreadCount = await ticketRepo.count({
                where: { is_read: false }
            });

            res.json({ tickets, unread_count: unreadCount });
        } catch (error: any) {
            console.error('[SupportController] getAllTickets error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Admin: Get unread ticket count
    static async getUnreadCount(req: AuthRequest, res: Response) {
        try {
            const ticketRepo = AppDataSource.getRepository(SupportTicket);
            const unreadCount = await ticketRepo.count({
                where: { is_read: false }
            });

            res.json({ unread_count: unreadCount });
        } catch (error: any) {
            console.error('[SupportController] getUnreadCount error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Admin: Mark ticket as read
    static async markAsRead(req: AuthRequest, res: Response) {
        try {
            const { ticketId } = req.params;

            const ticketRepo = AppDataSource.getRepository(SupportTicket);
            const ticket = await ticketRepo.findOne({ where: { id: ticketId as string } });

            if (!ticket) {
                return res.status(404).json({ error: '티켓을 찾을 수 없습니다.' });
            }

            ticket.is_read = true;
            await ticketRepo.save(ticket);

            res.json({ success: true });
        } catch (error: any) {
            console.error('[SupportController] markAsRead error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Admin: Respond to ticket
    static async respondToTicket(req: AuthRequest, res: Response) {
        try {
            const { ticketId } = req.params;
            const { response, status } = req.body;

            if (!response) {
                return res.status(400).json({ error: '답변 내용을 입력해주세요.' });
            }

            const ticketRepo = AppDataSource.getRepository(SupportTicket);
            const ticket = await ticketRepo.findOne({ where: { id: ticketId as string } });

            if (!ticket) {
                return res.status(404).json({ error: '티켓을 찾을 수 없습니다.' });
            }

            ticket.admin_response = response;
            ticket.responded_by = req.user.name;
            ticket.is_read = true;

            if (status) {
                ticket.status = status;
                if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
                    ticket.resolved_at = new Date();
                }
            }

            await ticketRepo.save(ticket);

            res.json({
                success: true,
                message: '답변이 등록되었습니다.',
                ticket
            });
        } catch (error: any) {
            console.error('[SupportController] respondToTicket error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Admin: Update ticket status
    static async updateTicketStatus(req: AuthRequest, res: Response) {
        try {
            const { ticketId } = req.params;
            const { status } = req.body;

            const ticketRepo = AppDataSource.getRepository(SupportTicket);
            const ticket = await ticketRepo.findOne({ where: { id: ticketId as string } });

            if (!ticket) {
                return res.status(404).json({ error: '티켓을 찾을 수 없습니다.' });
            }

            ticket.status = status;
            if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
                ticket.resolved_at = new Date();
            }

            await ticketRepo.save(ticket);

            res.json({ success: true, ticket });
        } catch (error: any) {
            console.error('[SupportController] updateTicketStatus error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}
