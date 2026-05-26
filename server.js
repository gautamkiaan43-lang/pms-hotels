// server.js
import http from 'http';
import app from './src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
