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

// ---------- máscaras (servem para digitar e para exibir dados antigos sem pontuação) ----------
function aplicar(digitos, molde) {
  let i = 0, saida = ''
  for (const ch of molde) {
    if (i >= digitos.length) break
    if (ch === '0') saida += digitos[i++]
    else saida += ch
  }
  return saida
}

/** CPF (000.000.000-00) até 11 dígitos; CNPJ (00.000.000/0000-00) a partir do 12º. */
export function mascaraDoc(v) {
  const d = soDigitos(v).slice(0, 14)
  return d.length <= 11 ? aplicar(d, '000.000.000-00') : aplicar(d, '00.000.000/0000-00')
}

/** (14) 99677-2440 para celular, (14) 3333-4444 para fixo; aceita 55 na frente. */
export function mascaraFone(v) {
  let d = soDigitos(v)
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  d = d.slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  return d.length <= 10 ? aplicar(d, '(00) 0000-0000') : aplicar(d, '(00) 00000-0000')
}

export const mascaraCep = (v) => aplicar(soDigitos(v).slice(0, 8), '00000-000')

function digitoVerificador(base, pesos) {
  const soma = pesos.reduce((s, p, i) => s + Number(base[i]) * p, 0)
  const r = soma % 11
  return r < 2 ? 0 : 11 - r
}

/** '' se ainda incompleto, 'ok' se válido, 'invalido' se os dígitos não conferem. */
export function validarDoc(v) {
  const d = soDigitos(v)
  if (d.length === 11) {
    if (/^(\d)\1+$/.test(d)) return 'invalido'
    const d1 = digitoVerificador(d, [10, 9, 8, 7, 6, 5, 4, 3, 2])
    const d2 = digitoVerificador(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
    return d1 === Number(d[9]) && d2 === Number(d[10]) ? 'ok' : 'invalido'
  }
  if (d.length === 14) {
    if (/^(\d)\1+$/.test(d)) return 'invalido'
    const d1 = digitoVerificador(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    const d2 = digitoVerificador(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return d1 === Number(d[12]) && d2 === Number(d[13]) ? 'ok' : 'invalido'
  }
  return ''
}

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
