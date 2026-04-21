import { prisma } from '@/src/lib/prisma'
import { buildPairCheatMap } from '@/src/lib/anti-cheat'

export async function GET() {
  const scores = await prisma.score.findMany({
    select: {
      id: true,
      player_id: true,
      payment_hash: true,
      time_ms: true,
      visible: true,
      createdAt: true,
    },
  })

  if (scores.length === 0) {
    return Response.json([])
  }

  const pairFilters = scores.map((score) => ({
    player_id: score.player_id,
    payment_hash: score.payment_hash,
  }))

  const players = await prisma.player.findMany({
    where: {
      OR: pairFilters,
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

  const collectLogs = await prisma.collectLog.findMany({
    where: {
      OR: pairFilters,
    },
    select: {
      player_id: true,
      payment_hash: true,
      round: true,
      time_ms: true,
      start_play: true,
      end_play: true,
      submitted: true,
      collect_time: true,
      collect_move: true,
      collect_fruit: true,
    },
  })

  const cheatByPair = buildPairCheatMap(collectLogs)

  const mergedScores = scores.map((score) => ({
    ...(() => {
      const key = `${score.player_id}:${score.payment_hash}`
      const pairResult = cheatByPair.get(key)

      return {
        isCheater: pairResult?.isCheater ?? false,
        cheatReasons: pairResult?.reasons ?? [],
        cheatEvidence: pairResult?.reasonEvidence ?? {},
      }
    })(),
    id: score.id,
    player_id: score.player_id,
    payment_hash: score.payment_hash,
    playerName:
      playerNameByComposite.get(`${score.player_id}:${score.payment_hash}`) ?? null,
    time_ms: score.time_ms,
    visible: score.visible,
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