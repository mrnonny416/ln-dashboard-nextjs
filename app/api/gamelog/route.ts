import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const logs = await prisma.collectLog.findMany({
    orderBy: { start_play: 'desc' },
    include: {
      Invoice: {
        select: {
          status: true,
        },
      },
    },
  })

  return Response.json(logs)
}