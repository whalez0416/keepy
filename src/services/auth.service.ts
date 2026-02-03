import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database.js';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'keepy-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
    /**
     * Register a new user
     */
    static async register(email: string, password: string, name: string, phone?: string): Promise<{ user: User; token: string }> {
        const userRepo = AppDataSource.getRepository(User);

        // Check if user already exists
        const existingUser = await userRepo.findOneBy({ email });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const user = userRepo.create({
            email,
            password_hash,
            name,
            phone
        });

        await userRepo.save(user);

        // Generate JWT
        const token = this.generateToken(user);

        return { user, token };
    }

    /**
     * Login user
     */
    static async login(email: string, password: string): Promise<{ user: User; token: string }> {
        const userRepo = AppDataSource.getRepository(User);

        // Find user
        const user = await userRepo.findOneBy({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Generate JWT
        const token = this.generateToken(user);

        return { user, token };
    }

    /**
     * Verify JWT token
     */
    static async verifyToken(token: string): Promise<User> {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOneBy({ id: decoded.userId });

            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    /**
     * Generate JWT token
     */
    private static generateToken(user: User): string {
        return jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }
}
