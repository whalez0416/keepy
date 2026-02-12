import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import type { SiteMember } from "./SiteMember.js";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    password_hash!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ default: "user" })
    role!: string; // Legacy: "admin" or "user" (kept for backward compatibility)

    @Column({ default: "user" })
    system_role!: string; // "superadmin" | "user"

    @Column({ default: "free" })
    subscription_type!: string; // "free", "basic", "pro", "enterprise"

    // Legacy relationship (backward compatibility)
    @OneToMany("Site", "user")
    sites!: any[];

    // New multi-tenant relationship
    @OneToMany("SiteMember", "user")
    siteMembers!: SiteMember[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
