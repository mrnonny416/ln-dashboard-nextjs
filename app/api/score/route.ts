import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const [scores, score_jan, players] = await Promise.all([
    prisma.score.findMany({
      select: {
        id: true,
        player_id: true,
        time_ms: true,
        createdAt: true,
        Player: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.score_Temp.findMany(),
    prisma.player.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
  ])

  const playerNameById = new Map(players.map((player) => [player.id, player.name]))

  const normalizedScores = scores.map((score) => ({
    id: score.id,
    player_id: score.player_id,
    playerName: score.Player?.name ?? playerNameById.get(score.player_id) ?? null,
    time_ms: score.time_ms,
    createdAt: score.createdAt,
    source: 'score',
  }))

  const normalizedArchived = score_jan.map((score) => ({
    id: score.id,
    player_id: score.player_id,
    playerName: playerNameById.get(score.player_id) ?? null,
    time_ms: score.time_ms,
    createdAt: score.createdAt,
    source: 'score_jan_feb_2026',
  }))

  const mergedScores = [...normalizedScores, ...normalizedArchived]

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