import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    orderBy: [{ created_at: 'desc' }],
    select: {
      id: true,
      player_id: true,
      payment_hash: true,
      bolt11: true,
      amount_sats: true,
      memo: true,
      status: true,
      created_at: true,
      paid_at: true,
    },
  })

  return Response.json({
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      playerId: invoice.player_id,
      paymentHash: invoice.payment_hash,
      bolt11: invoice.bolt11,
      amountSats: invoice.amount_sats,
      memo: invoice.memo,
      status: invoice.status,
      createdAt: invoice.created_at,
      paidAt: invoice.paid_at,
    })),
  })
}