import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import type { Site } from "./Site.js";

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

    @Column({ default: "user" }) // "admin" or "user"
    role!: string;

    @Column({ default: "free" }) // "free", "basic", "pro", "enterprise"
    subscription_type!: string;

    @OneToMany("Site", "user")
    sites!: Site[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
