import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from "typeorm";
import type { SiteMember } from "./SiteMember.js";
import type { User } from "./User.js";

@Entity("sites")
export class Site {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    // Legacy relationship (backward compatibility)
    @ManyToOne("User", "sites")
    user!: User;

    // New multi-tenant relationship
    @OneToMany("SiteMember", "site")
    members!: SiteMember[];

    @Column()
    site_name!: string;

    @Column()
    target_url!: string;

    @Column({ type: "int" })
    monitoring_interval!: number; // 1-10

    @Column({ default: true })
    is_active!: boolean;

    @Column({ default: false })
    self_healing_enabled!: boolean;

    @Column({ nullable: true })
    healing_command?: string;

    @Column({ nullable: true })
    db_host?: string;

    @Column({ nullable: true })
    db_user?: string;

    @Column({ nullable: true, select: false }) // Password should be hidden by default
    db_pass?: string;

    @Column({ nullable: true })
    db_name?: string;

    @Column({ nullable: true })
    db_port?: string;

    @Column({ nullable: true })
    db_type?: string;

    // SFTP/FTP fields (backward compatibility)
    @Column({ nullable: true })
    ftp_host?: string;

    @Column({ nullable: true })
    ftp_user?: string;

    @Column({ nullable: true, select: false })
    ftp_pass?: string;

    @Column({ nullable: true })
    ftp_port?: string;

    @Column({ nullable: true })
    sftp_host?: string;

    @Column({ nullable: true })
    sftp_user?: string;

    @Column({ nullable: true, select: false })
    sftp_pass?: string;

    @Column({ nullable: true })
    remote_path?: string;

    @Column({ default: "php" })
    site_type!: string; // php, jsp, wp

    // Bridge and onboarding fields
    @Column({ nullable: true })
    bridge_path?: string;

    @Column({ nullable: true })
    bridge_version?: string;

    @Column({ nullable: true })
    domain?: string;

    @Column({ default: "pending" })
    onboarding_status!: string;

    @Column({ default: 1 })
    onboarding_level!: number;

    @Column({ type: "jsonb", nullable: true })
    discovered_boards?: any;

    @Column({ type: "jsonb", nullable: true })
    linked_boards?: any;

    // Board targeting
    @Column({ nullable: true })
    target_board_table?: string;

    @Column({ nullable: true })
    specific_board_table?: string;

    // Permissions
    @Column({ default: false })
    can_user_delete_spam!: boolean;

    // Security: per-site unique API key for bridge authentication
    // Auto-generated as UUID when site is registered. Embedded into bridge PHP on deploy.
    @Column({ nullable: true, select: false })
    bridge_api_key?: string;

    // Tracking fields
    @Column({ nullable: true })
    last_scanned_id?: string;

    @Column({ type: "timestamp", nullable: true })
    last_scanned_at?: Date;

    @Column({ type: "timestamp", nullable: true })
    last_checked_at?: Date;

    @Column({ default: "unknown" })
    current_status!: string;


    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
