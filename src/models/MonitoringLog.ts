import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from "typeorm";
import { Site } from "./Site.js";

export enum MonitoringEventType {
    SPAM_DETECTED = "SPAM_DETECTED",
    SITE_DOWN = "SITE_DOWN",
    MAPPING_FAILED = "MAPPING_FAILED",
    DISCOVERY_FAILED = "DISCOVERY_FAILED",
    HEALTH_CHECK = "HEALTH_CHECK"
}

@Entity("monitoring_logs")
export class MonitoringLog {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Site, { onDelete: "CASCADE" })
    @Index()
    site!: Site;

    @Column({
        type: "enum",
        enum: MonitoringEventType
    })
    event_type!: MonitoringEventType;

    @Column()
    message!: string;

    @Column({
        type: "varchar",
        default: "detected"
    })
    status!: "detected" | "deleted" | "delete_failed";

    @Column({ type: "jsonb", nullable: true })
    trace?: string[]; // JSON array of bridge execution steps

    @Column({ type: "jsonb", nullable: true })
    meta?: any; // Additional context (score, reasons, actedBy, actedAt)

    @CreateDateColumn()
    created_at!: Date;
}
