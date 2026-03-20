import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const users = await prisma.player.findMany()

  return Response.json(users)
}