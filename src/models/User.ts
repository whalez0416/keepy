import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Site } from "./Site.js";

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

    @OneToMany(() => Site, (site) => site.user)
    sites!: Site[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
