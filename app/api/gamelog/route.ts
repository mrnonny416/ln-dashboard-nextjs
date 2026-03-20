import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const users = await prisma.userPlayLog.findMany()

  return Response.json(users)
}