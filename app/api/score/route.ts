import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const scores = await prisma.score.findMany({
    select: {
      id: true,
      player_id: true,
      payment_hash: true,
      time_ms: true,
      createdAt: true,
    },
  })

  if (scores.length === 0) {
    return Response.json([])
  }

  const players = await prisma.player.findMany({
    where: {
      OR: scores.map((score) => ({
        player_id: score.player_id,
        payment_hash: score.payment_hash,
      })),
    },
    select: {
      player_id: true,
      payment_hash: true,
      name: true,
    },
  })

  const playerNameByComposite = new Map(
    players.map((player) => [`${player.player_id}:${player.payment_hash}`, player.name])
  )

  const mergedScores = scores.map((score) => ({
    id: score.id,
    player_id: score.player_id,
    playerName:
      playerNameByComposite.get(`${score.player_id}:${score.payment_hash}`) ?? null,
    time_ms: score.time_ms,
    createdAt: score.createdAt,
    source: 'score' as const,
  }))

  mergedScores.sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (timeDiff !== 0) {
      return timeDiff
    }

    if (a.time_ms !== b.time_ms) {
      return a.time_ms - b.time_ms
    }

    return a.id - b.id
  })

  return Response.json(mergedScores)
}