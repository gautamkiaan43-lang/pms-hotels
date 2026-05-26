// src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/error.js';

const prisma = new PrismaClient();

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.cookies?.token;
    if (!authHeader) {
      throw new AppError('Missing authentication token', 401);
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user info (id, role) to request
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw new AppError('User not found', 401);
    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(new AppError(err.message || 'Unauthorized', err.statusCode || 401));
  }
};
