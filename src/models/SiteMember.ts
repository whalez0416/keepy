import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, JoinColumn } from "typeorm";
import { User } from "./User.js";
import { Site } from "./Site.js";

@Entity("site_members")
@Index(["user", "site"], { unique: true })
export class SiteMember {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, user => user.siteMembers, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @ManyToOne(() => Site, site => site.members, { onDelete: "CASCADE" })
    @JoinColumn({ name: "siteId" })
    site!: Site;

    @Column({ default: "staff" })
    role!: string; // "owner" | "staff" | "viewer"

    @Column({ default: true })
    can_delete_spam!: boolean;

    @Column({ default: true })
    can_view_logs!: boolean;

    @Column({ default: false })
    can_manage_members!: boolean;

    @CreateDateColumn()
    joined_at!: Date;
}
