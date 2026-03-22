import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      player_id: true,
      payment_hash: true,
      name: true,
      createdAt: true,
    },
  })

  return Response.json({
    players: players.map((player) => ({
      id: player.id,
      playerId: player.player_id,
      paymentHash: player.payment_hash,
      name: player.name,
      createdAt: player.createdAt,
    })),
  })
}