"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Site = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
@(0, typeorm_1.Entity)("sites")
class Site {
    @(0, typeorm_1.PrimaryGeneratedColumn)("uuid")
    id;
    @(0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.sites)
    user;
    @(0, typeorm_1.Column)()
    site_name;
    @(0, typeorm_1.Column)()
    target_url;
    @(0, typeorm_1.Column)({ type: "int" })
    monitoring_interval; // 1-10
    @(0, typeorm_1.Column)({ default: true })
    is_active;
    @(0, typeorm_1.Column)({ default: false })
    self_healing_enabled;
    @(0, typeorm_1.Column)({ nullable: true })
    healing_command;
    @(0, typeorm_1.Column)({ default: "unknown" })
    current_status;
    @(0, typeorm_1.Column)({ type: "timestamp", nullable: true })
    last_checked_at;
    @(0, typeorm_1.CreateDateColumn)()
    created_at;
    @(0, typeorm_1.UpdateDateColumn)()
    updated_at;
}
exports.Site = Site;
//# sourceMappingURL=Site.js.map