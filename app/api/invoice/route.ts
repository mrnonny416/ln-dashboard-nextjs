import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const users = await prisma.invoice.findMany()

  return Response.json(users)
}