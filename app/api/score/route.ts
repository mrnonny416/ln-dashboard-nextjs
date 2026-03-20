import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const scores = await prisma.score.findMany()
  const score_jan = await prisma.score_jan_feb_2026.findMany()

  const mergedScores = [...scores, ...score_jan]

  return Response.json(mergedScores.sort((a, b) => a.id - b.id))
}