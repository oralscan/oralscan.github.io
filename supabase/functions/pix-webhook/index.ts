// Recebe a notificação do Mercado Pago. Nunca confia no corpo da notificação:
// consulta o pagamento direto na API do Mercado Pago e só libera se "approved".
// A função liberar_compra é idempotente (não duplica créditos).
// Publique com "Verify JWT" DESLIGADO (o Mercado Pago não envia login).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url)
    let id = u.searchParams.get('data.id') ?? u.searchParams.get('id')
    let tipo = u.searchParams.get('type') ?? u.searchParams.get('topic')
    if (req.method === 'POST') {
      const b = await req.json().catch(() => ({}))
      id = b?.data?.id ?? id
      tipo = b?.type ?? b?.topic ?? tipo
    }
    if (!id || (tipo && tipo !== 'payment')) return new Response('ignorado', { status: 200 })

    const token = Deno.env.get('MP_ACCESS_TOKEN')!
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) return new Response('pagamento não encontrado', { status: 200 })
    const pg = await r.json()

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const compraId = pg.external_reference
    if (pg.status === 'approved') {
      const { error } = await admin.rpc('liberar_compra', { p_compra: compraId, p_transacao: String(pg.id) })
      if (error) console.error(error)
    } else if (pg.status === 'refunded' || pg.status === 'charged_back') {
      await admin.from('compras').update({ status: 'estornado' }).eq('id', compraId).eq('status', 'pago')
      await admin.from('creditos').update({ status: 'estornado' }).eq('compra_id', compraId).eq('status', 'disponivel')
    } else if (pg.status === 'cancelled' || pg.status === 'rejected') {
      await admin.from('compras').update({ status: 'cancelado' }).eq('id', compraId).eq('status', 'pendente')
    }
    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('erro', { status: 200 })
  }
})
