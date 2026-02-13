import bcrypt from 'bcrypt';
import { AuthRequest } from "../middleware/auth.middleware.js";
import { Response } from "express";
import { AppDataSource } from "../config/database.js";
import { User } from "../models/User.js";

export class PasswordController {
    /**
     * Change user password
     * Requires current password verification
     * Invalidates current session and requires re-login for security
     */
    static async changePassword(req: AuthRequest, res: Response) {
        try {
            const { currentPassword, newPassword } = req.body;

            // Validation
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ error: '새 비밀번호는 8자 이상이어야 합니다.' });
            }

            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({ where: { id: req.user.id } });

            if (!user) {
                return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
            }

            // Check if user is OAuth user (no password)
            if (!user.password_hash || user.provider !== 'local') {
                return res.status(400).json({
                    error: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.'
                });
            }

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
            }

            // Hash and save new password
            user.password_hash = await bcrypt.hash(newPassword, 10);
            user.updated_at = new Date();
            await userRepo.save(user);

            console.log(`[PasswordController] Password changed for user: ${user.email}`);

            // Return success with instruction to re-login
            res.json({
                success: true,
                message: '비밀번호가 변경되었습니다. 보안을 위해 다시 로그인해주세요.',
                require_relogin: true
            });
        } catch (error: any) {
            console.error('[PasswordController] changePassword error:', error.message);
            res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
        }
    }
}
