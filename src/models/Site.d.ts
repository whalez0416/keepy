import { User } from "./User";
export declare class Site {
    id: string;
    user: User;
    site_name: string;
    target_url: string;
    monitoring_interval: number;
    is_active: boolean;
    self_healing_enabled: boolean;
    healing_command: string;
    current_status: string;
    last_checked_at: Date;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=Site.d.ts.map