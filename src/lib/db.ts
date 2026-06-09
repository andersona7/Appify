import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  // Create a connection pool with pg
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  // Wrap pg pool with PrismaPg adapter
  const adapter = new PrismaPg(pool);

  // Return new client with the adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
