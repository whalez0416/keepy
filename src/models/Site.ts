import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import type { User } from "./User.js";

@Entity("sites")
export class Site {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne("User", "sites")
    user!: User;

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
    domain?: string; // 도메인 (예: minhospital.co.kr)

    @Column({ default: "unknown" })
    current_status!: string;

    @Column({ type: "timestamp", nullable: true })
    last_checked_at?: Date;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
