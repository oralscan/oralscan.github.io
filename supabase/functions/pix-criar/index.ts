// Gera o PIX dinâmico (Mercado Pago) para uma compra pendente do dentista logado.
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   MP_ACCESS_TOKEN  – Access Token de PRODUÇÃO do Mercado Pago da clínica
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ erro: 'Faça login.' }, 401)

    const { compra_id } = await req.json()
    const { data: compra } = await admin.from('compras').select('*').eq('id', compra_id).single()
    if (!compra || compra.dentista_id !== user.id) return json({ erro: 'Compra não encontrada.' }, 404)
    if (compra.status !== 'pendente') return json({ erro: 'Compra já está ' + compra.status }, 400)
    if (compra.pix_copia_cola) return json({ ok: true, compra })

    const token = Deno.env.get('MP_ACCESS_TOKEN')
    if (!token) return json({ erro: 'Mercado Pago não configurado.' }, 501)

    const { data: perfil } = await admin.from('perfis').select('nome,email,cpf_cnpj').eq('id', user.id).single()
    const doc = (perfil?.cpf_cnpj ?? '').replace(/\D/g, '')
    const resp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': compra.id,
      },
      body: JSON.stringify({
        transaction_amount: Number(compra.valor),
        description: `Oral Scan – ${compra.combo_nome}`,
        payment_method_id: 'pix',
        external_reference: compra.id,
        notification_url: `${url}/functions/v1/pix-webhook`,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payer: {
          email: perfil?.email || user.email,
          first_name: perfil?.nome,
          ...(doc ? { identification: { type: doc.length > 11 ? 'CNPJ' : 'CPF', number: doc } } : {}),
        },
      }),
    })
    const pg = await resp.json()
    if (!resp.ok) return json({ erro: 'Falha no Mercado Pago', detalhe: pg }, 502)

    const td = pg.point_of_interaction?.transaction_data ?? {}
    const { data: atual } = await admin.from('compras').update({
      gateway: 'mercadopago',
      transacao_id: String(pg.id),
      pix_copia_cola: td.qr_code,
      pix_qr_base64: td.qr_code_base64,
    }).eq('id', compra.id).select().single()
    return json({ ok: true, compra: atual })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
