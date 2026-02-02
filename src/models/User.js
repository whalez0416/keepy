"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const typeorm_1 = require("typeorm");
const Site_1 = require("./Site");
@(0, typeorm_1.Entity)("users")
class User {
    @(0, typeorm_1.PrimaryGeneratedColumn)("uuid")
    id;
    @(0, typeorm_1.Column)({ unique: true })
    email;
    @(0, typeorm_1.Column)()
    password_hash;
    @(0, typeorm_1.Column)()
    name;
    @(0, typeorm_1.Column)({ nullable: true })
    phone;
    @(0, typeorm_1.OneToMany)(() => Site_1.Site, (site) => site.user)
    sites;
    @(0, typeorm_1.CreateDateColumn)()
    created_at;
    @(0, typeorm_1.UpdateDateColumn)()
    updated_at;
}
exports.User = User;
//# sourceMappingURL=User.js.map