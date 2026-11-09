export const STATUS_AG = {
  agendado: { rotulo: 'Agendado', cor: 'azul' },
  concluido: { rotulo: 'Concluído', cor: 'verde' },
  cancelado: { rotulo: 'Cancelado', cor: 'cinza' },
  falta: { rotulo: 'Falta', cor: 'vermelho' },
}
export const STATUS_COMPRA = {
  pendente: { rotulo: 'Aguardando pagamento', cor: 'amarelo' },
  pago: { rotulo: 'Pago', cor: 'verde' },
  cancelado: { rotulo: 'Cancelado', cor: 'cinza' },
  estornado: { rotulo: 'Estornado', cor: 'vermelho' },
}
export const MODALIDADE = { sede: 'Na sede', externo: 'Na clínica do dentista', ambos: 'Sede ou externo' }

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

export const soDigitos = (s) => String(s || '').replace(/\D/g, '')

export function linkWhats(numero, texto) {
  let n = soDigitos(numero)
  if (n && n.length <= 11) n = '55' + n
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

export const precoAtual = (c, hojeYmd) =>
  c.preco_promocional != null && (!c.promocao_ate || c.promocao_ate >= hojeYmd) ? Number(c.preco_promocional) : Number(c.preco)

export function resumoCreditos(creditos, hojeYmd) {
  const r = { disponiveis: 0, usados: 0, vencidos: 0, estornados: 0, total: creditos.length, proxVencimento: null }
  for (const c of creditos) {
    if (c.status === 'usado') r.usados++
    else if (c.status === 'estornado') r.estornados++
    else if (c.validade < hojeYmd) r.vencidos++
    else {
      r.disponiveis++
      if (!r.proxVencimento || c.validade < r.proxVencimento) r.proxVencimento = c.validade
    }
  }
  return r
}

export function baixarArquivo(nome, conteudo, tipo = 'text/plain') {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
