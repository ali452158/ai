import { PrismaClient } from '@prisma/client'

// On Vercel (serverless), we need to reuse the Prisma client across
// hot-reloads to avoid exhausting database connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Reduce logging in production for performance
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
