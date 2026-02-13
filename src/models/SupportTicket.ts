import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User.js";

export enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    RESOLVED = "resolved",
    CLOSED = "closed"
}

export enum TicketPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}

@Entity("support_tickets")
export class SupportTicket {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    subject: string;

    @Column("text")
    message: string;

    @Column({
        type: "enum",
        enum: TicketStatus,
        default: TicketStatus.OPEN
    })
    status: TicketStatus;

    @Column({
        type: "enum",
        enum: TicketPriority,
        default: TicketPriority.MEDIUM
    })
    priority: TicketPriority;

    @ManyToOne(() => User)
    user: User;

    @Column({ nullable: true, type: "text" })
    admin_response: string;

    @Column({ nullable: true })
    responded_by: string; // Admin name who responded

    @Column({ default: false })
    is_read: boolean; // Admin has read the ticket

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ nullable: true })
    resolved_at: Date;
}
