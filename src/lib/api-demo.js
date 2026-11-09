// MODO DEMONSTRAÇÃO: mesmas regras do banco real, mas os dados ficam só neste navegador.
import { dataHora, hoje, somaDias, ymd, hm, diaSemana, minutos, addMin } from './tempo.js'
import { folgas } from './agenda.js'

const CHAVE = 'oralscan-demo-v2'
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))
const espera = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120))

const HORARIOS = {
  0: [], 6: [],
  1: [{ ini: '08:00', fim: '12:00' }, { ini: '13:30', fim: '18:00' }],
  2: [{ ini: '08:00', fim: '12:00' }, { ini: '13:30', fim: '18:00' }],
  3: [{ ini: '08:00', fim: '12:00' }, { ini: '13:30', fim: '18:00' }],
  4: [{ ini: '08:00', fim: '12:00' }, { ini: '13:30', fim: '18:00' }],
  5: [{ ini: '08:00', fim: '12:00' }, { ini: '13:30', fim: '18:00' }],
}

function semente() {
  const admin = uid(), dent = uid(), dent2 = uid()
  const servicos = [
    ['Prótese', 'Coroas, onlays, overlays, próteses fixas', 30],
    ['Ortodontia', 'Escaneamento para documentação e planejamento ortodôntico', 30],
    ['Estética', 'Facetas e reabilitação oral', 40],
    ['Implantodontia', 'Escaneamento para planejamento e próteses sobre implantes', 40],
    ['Modelos e planejamento digital', 'Modelos digitais e outros planejamentos', 30],
  ].map(([nome, descricao, duracao_min], i) => ({ id: uid(), nome, descricao, duracao_min, ativo: true, ordem: i + 1 }))
  const regioes = [
    { id: uid(), nome: 'Centro', deslocamento_min: 20, ativo: true },
    { id: uid(), nome: 'Zona Sul', deslocamento_min: 35, ativo: true },
    { id: uid(), nome: 'Zona Norte', deslocamento_min: 40, ativo: true },
  ]
  const combos = [
    { id: uid(), nome: 'Avulso', descricao: '1 escaneamento intraoral', qtd_creditos: 1, preco: 180, preco_promocional: null, promocao_ate: null, validade_dias: 60, condicoes: 'Válido para qualquer categoria.', modalidade: 'sede', ativo: true },
    { id: uid(), nome: 'Combo 5', descricao: '5 escaneamentos na sede ou na sua clínica', qtd_creditos: 5, preco: 800, preco_promocional: 720, promocao_ate: somaDias(hoje(), 20), validade_dias: 120, condicoes: 'Atendimento externo conforme região atendida.', modalidade: 'ambos', ativo: true },
    { id: uid(), nome: 'Combo 10', descricao: '10 escaneamentos – melhor custo', qtd_creditos: 10, preco: 1500, preco_promocional: null, promocao_ate: null, validade_dias: 180, condicoes: 'Atendimento externo conforme região atendida.', modalidade: 'ambos', ativo: true },
  ].map((c) => ({ ...c, criado_em: new Date().toISOString() }))
  const perfil = (id, o) => ({ id, papel: 'dentista', nome: '', cro: '', cro_uf: '', cpf_cnpj: '', clinica: '', telefone: '', whatsapp: '', email: '', endereco: '', bairro: '', cidade: '', cep: '', ativo: true, consentimento_lgpd: new Date().toISOString(), criado_em: new Date().toISOString(), ...o })
  const db = {
    usuarios: [
      { id: admin, email: 'admin@demo.com', senha: 'demo123' },
      { id: dent, email: 'dentista@demo.com', senha: 'demo123' },
      { id: dent2, email: 'carla@demo.com', senha: 'demo123' },
    ],
    perfis: [
      perfil(admin, { papel: 'admin', nome: 'Dra. Tamires Bueno', email: 'admin@demo.com', whatsapp: '14988203130' }),
      perfil(dent, { nome: 'Dr. Rafael Moreira', cro: '12345', cro_uf: 'SP', cpf_cnpj: '123.456.789-00', clinica: 'Sorriso Prime', telefone: '1133334444', whatsapp: '11988887777', email: 'dentista@demo.com', endereco: 'Rua das Flores, 120', bairro: 'Centro', cidade: 'São Paulo', cep: '01000-000' }),
      perfil(dent2, { nome: 'Dra. Carla Nunes', cro: '54321', cro_uf: 'SP', clinica: 'OdontoVida', whatsapp: '11977776666', email: 'carla@demo.com', endereco: 'Av. Paulista, 900', cidade: 'São Paulo' }),
    ],
    config: { id: 1, antecedencia_horas: 48, passo_min: 30, intervalo_min: 15, intervalo_externo_min: 60, cancelamento_horas: 24, horarios: HORARIOS, endereco_sede: 'Rua Exemplo, 100 – Sala 12', whatsapp_clinica: '14988203130', chave_pix: 'pix@oralscan.com.br', politica_privacidade: '' },
    servicos, regioes, combos,
    bloqueios: [],
    compras: [], creditos: [], agendamentos: [], auditoria: [],
    sessao: null,
  }
  // histórico de exemplo
  const compra = (dentista_id, combo, diasAtras, status = 'pago') => {
    const c = { id: uid(), dentista_id, combo_id: combo.id, combo_nome: combo.nome, qtd_creditos: combo.qtd_creditos, modalidade: combo.modalidade, validade_dias: combo.validade_dias, valor: combo.preco_promocional ?? combo.preco, status: 'pendente', gateway: 'manual', transacao_id: null, pix_copia_cola: null, pix_qr_base64: null, pago_em: null, nf_path: null, criado_em: addMin(new Date(), -diasAtras * 1440).toISOString() }
    db.compras.push(c)
    if (status === 'pago') { liberar(db, c.id, 'DEMO-' + c.id.slice(0, 8)); c.pago_em = c.criado_em }
    return c
  }
  compra(dent, combos[1], 12)
  compra(dent2, combos[2], 30)
  compra(dent2, combos[0], 3, 'pendente')
  // dois agendamentos futuros para a agenda não ficar vazia
  let d = somaDias(hoje(), 3)
  while ((HORARIOS[diaSemana(d)] || []).length === 0) d = somaDias(d, 1)
  criarAgendamento(db, { dentista_id: dent2, servico_id: servicos[1].id, modalidade: 'sede', inicio: dataHora(d, '09:00'), paciente_nome: 'Mariana Alves', dentes_regiao: 'Arcada completa', observacoes: '' }, true)
  criarAgendamento(db, { dentista_id: dent, servico_id: servicos[0].id, modalidade: 'externo', regiao_id: regioes[0].id, endereco: 'Rua das Flores, 120 – Centro', inicio: dataHora(d, '14:00'), paciente_nome: 'João Pedro Lima', dentes_regiao: '36, 37', observacoes: 'Coroa sobre implante' }, true)
  db.sessao = null
  return db
}

function liberar(db, compraId, transacao) {
  const c = db.compras.find((x) => x.id === compraId)
  if (!c) throw new Error('Compra não encontrada')
  if (c.status === 'pago') return
  if (c.status !== 'pendente') throw new Error('Compra está ' + c.status)
  c.status = 'pago'; c.pago_em = new Date().toISOString(); c.transacao_id = c.transacao_id || transacao || 'MANUAL'
  const validade = somaDias(hoje(), c.validade_dias)
  for (let i = 0; i < c.qtd_creditos; i++) {
    db.creditos.push({ id: uid(), compra_id: c.id, dentista_id: c.dentista_id, modalidade: c.modalidade, validade, status: 'disponivel', agendamento_id: null, criado_em: new Date().toISOString() })
  }
}

function criarAgendamento(db, p, comoAdmin) {
  const cfg = db.config
  const s = db.servicos.find((x) => x.id === p.servico_id && x.ativo)
  if (!s) throw new Error('Serviço indisponível.')
  if (!String(p.paciente_nome || '').trim()) throw new Error('Informe o nome do paciente.')
  const perfil = db.perfis.find((x) => x.id === p.dentista_id)
  if (!perfil?.ativo) throw new Error('Cadastro inativo. Fale com a clínica.')
  const ini = new Date(p.inicio), fim = addMin(ini, s.duracao_min)
  let regiao = null
  if (p.modalidade === 'externo') {
    regiao = db.regioes.find((r) => r.id === p.regiao_id && r.ativo)
    if (!regiao) throw new Error('Região não atendida no atendimento externo.')
    if (!String(p.endereco || '').trim()) throw new Error('Informe o endereço do atendimento.')
  }
  const { pre, pos } = folgas({ modalidade: p.modalidade, regiao, config: cfg })
  if (!comoAdmin && ini < addMin(new Date(), cfg.antecedencia_horas * 60)) throw new Error(`Agendamentos só com ${cfg.antecedencia_horas} horas de antecedência.`)
  const dia = ymd(ini)
  const dentro = (cfg.horarios[diaSemana(dia)] || []).some((j) => minutos(hm(ini)) >= minutos(j.ini) && minutos(hm(fim)) <= minutos(j.fim) && ymd(fim) === dia)
  if (!dentro) throw new Error('Horário fora do funcionamento.')
  const oIni = addMin(ini, -pre), oFim = addMin(fim, pos)
  if (db.bloqueios.some((b) => new Date(b.inicio) < fim && oIni < new Date(b.fim))) throw new Error('Horário bloqueado na agenda.')
  if (db.agendamentos.some((a) => ['agendado', 'concluido'].includes(a.status) && new Date(a.ocupa_ini) < oFim && oIni < new Date(a.ocupa_fim))) throw new Error('Este horário acabou de ser reservado. Escolha outro.')
  const hj = hoje()
  const cred = db.creditos
    .filter((c) => c.dentista_id === p.dentista_id && c.status === 'disponivel' && c.validade >= hj && ['ambos', p.modalidade].includes(c.modalidade))
    .sort((a, b) => a.validade.localeCompare(b.validade))[0]
  if (!cred) throw new Error('Você não tem créditos válidos para esta modalidade. Adquira um combo.')
  const a = {
    id: uid(), dentista_id: p.dentista_id, servico_id: s.id, servico_nome: s.nome, modalidade: p.modalidade,
    inicio: ini.toISOString(), fim: fim.toISOString(), ocupa_ini: oIni.toISOString(), ocupa_fim: oFim.toISOString(),
    endereco: p.modalidade === 'externo' ? p.endereco : cfg.endereco_sede, regiao_id: p.modalidade === 'externo' ? p.regiao_id : null,
    paciente_nome: p.paciente_nome.trim(), paciente_telefone: p.paciente_telefone || '', dentes_regiao: p.dentes_regiao || '', observacoes: p.observacoes || '',
    status: 'agendado', credito_id: cred.id, alteracao_solicitada: null, motivo_cancelamento: null,
    criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
  }
  db.agendamentos.push(a)
  cred.status = 'usado'; cred.agendamento_id = a.id
  return a
}

export function criarApiDemo() {
  let db
  try { db = JSON.parse(localStorage.getItem(CHAVE)) } catch { db = null }
  if (!db) db = semente()
  const ouvintes = new Set()
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)) } catch { /* modo privado */ } }
  salvar()
  const usuario = () => db.usuarios.find((u) => u.id === db.sessao) || null
  const eu = () => db.perfis.find((p) => p.id === db.sessao)
  const ehAdmin = () => eu()?.papel === 'admin' && eu()?.ativo
  const exigeAdmin = () => { if (!ehAdmin()) throw new Error('Apenas administradores.') }
  const audit = (tabela, registro_id, acao, depois) => db.auditoria.unshift({ id: Date.now() + Math.random(), tabela, registro_id, acao, usuario: db.sessao, antes: null, depois, em: new Date().toISOString() })
  const notifica = () => ouvintes.forEach((cb) => cb(usuario()))
  const comDentista = (x) => {
    const p = db.perfis.find((d) => d.id === x.dentista_id)
    return { ...x, dentista: p ? { nome: p.nome, clinica: p.clinica, whatsapp: p.whatsapp, telefone: p.telefone, email: p.email } : null }
  }
  const run = (fn) => { try { const r = fn(); salvar(); return espera(r ?? null) } catch (e) { return Promise.reject(e) } }

  return {
    demo: true,
    resetarDemo() { localStorage.removeItem(CHAVE); location.reload() },

    async sessao() { return usuario() },
    onAuth(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb) },
    entrar: (email, senha) => run(() => {
      const u = db.usuarios.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase() && x.senha === senha)
      if (!u) throw new Error('E-mail ou senha incorretos.')
      db.sessao = u.id; salvar(); setTimeout(notifica, 0)
    }),
    cadastrar: (dados, senha) => run(() => {
      if (db.usuarios.some((u) => u.email === dados.email)) throw new Error('Este e-mail já tem cadastro.')
      if (String(senha).length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
      const id = uid()
      db.usuarios.push({ id, email: dados.email, senha })
      db.perfis.push({ id, papel: 'dentista', ativo: true, ...dados, consentimento_lgpd: new Date().toISOString(), criado_em: new Date().toISOString() })
      db.sessao = id; salvar(); setTimeout(notifica, 0)
      return { precisaConfirmar: false }
    }),
    sair: () => run(() => { db.sessao = null; salvar(); setTimeout(notifica, 0) }),
    recuperarSenha: () => run(() => null),
    novaSenha: () => run(() => null),

    meuPerfil: () => run(() => eu() || null),
    salvarPerfil: (p) => run(() => {
      const atual = db.perfis.find((x) => x.id === p.id)
      if (!atual || (atual.id !== db.sessao && !ehAdmin())) throw new Error('Sem permissão.')
      const { papel, ativo, email, ...resto } = p
      Object.assign(atual, resto); audit('perfis', p.id, 'UPDATE', resto)
    }),

    config: () => run(() => db.config),
    salvarConfig: (c) => run(() => { exigeAdmin(); Object.assign(db.config, c); audit('config', '1', 'UPDATE', c) }),
    servicos: () => run(() => [...db.servicos].sort((a, b) => a.ordem - b.ordem)),
    salvarServico: (s) => run(() => {
      exigeAdmin()
      const at = db.servicos.find((x) => x.id === s.id)
      if (at) Object.assign(at, s); else db.servicos.push({ id: uid(), ativo: true, ordem: db.servicos.length + 1, ...s })
      audit('servicos', s.id, at ? 'UPDATE' : 'INSERT', s)
    }),
    regioes: () => run(() => [...db.regioes].sort((a, b) => a.nome.localeCompare(b.nome))),
    salvarRegiao: (r) => run(() => {
      exigeAdmin()
      const at = db.regioes.find((x) => x.id === r.id)
      if (at) Object.assign(at, r); else db.regioes.push({ id: uid(), ativo: true, ...r })
    }),
    excluirRegiao: (id) => run(() => { exigeAdmin(); db.regioes.find((x) => x.id === id).ativo = false }),
    combos: () => run(() => [...db.combos].sort((a, b) => a.preco - b.preco)),
    salvarCombo: (c) => run(() => {
      exigeAdmin()
      const at = db.combos.find((x) => x.id === c.id)
      const antes = at ? { ...at } : null
      if (at) Object.assign(at, c); else db.combos.push({ id: uid(), ativo: true, criado_em: new Date().toISOString(), ...c })
      db.auditoria.unshift({ id: Date.now(), tabela: 'combos', registro_id: c.id || '', acao: at ? 'UPDATE' : 'INSERT', usuario: db.sessao, antes, depois: c, em: new Date().toISOString() })
    }),

    ocupacao: (de, ate) => run(() => {
      const a = new Date(de), b = new Date(ate)
      return [
        ...db.agendamentos.filter((x) => ['agendado', 'concluido'].includes(x.status) && new Date(x.ocupa_ini) < b && a < new Date(x.ocupa_fim)).map((x) => ({ ini: x.ocupa_ini, fim: x.ocupa_fim, tipo: 'agendamento' })),
        ...db.bloqueios.filter((x) => new Date(x.inicio) < b && a < new Date(x.fim)).map((x) => ({ ini: x.inicio, fim: x.fim, tipo: 'bloqueio' })),
      ]
    }),
    agendar: (p) => run(() => {
      const dentista_id = p.dentista_id || db.sessao
      if (dentista_id !== db.sessao && !ehAdmin()) throw new Error('Sem permissão.')
      const a = criarAgendamento(db, { ...p, dentista_id }, ehAdmin())
      audit('agendamentos', a.id, 'INSERT', a)
      return a
    }),
    cancelar: (id, motivo = '', devolver = null) => run(() => {
      const a = db.agendamentos.find((x) => x.id === id)
      if (!a) throw new Error('Agendamento não encontrado.')
      if (a.dentista_id !== db.sessao && !ehAdmin()) throw new Error('Sem permissão.')
      if (a.status !== 'agendado') throw new Error(`Este agendamento já está ${a.status}.`)
      const devolve = ehAdmin() && devolver !== null ? devolver : (new Date(a.inicio) - new Date()) >= db.config.cancelamento_horas * 3600000
      a.status = 'cancelado'; a.motivo_cancelamento = motivo; a.atualizado_em = new Date().toISOString()
      audit('agendamentos', id, 'UPDATE', { status: 'cancelado', motivo })
      if (devolve && a.credito_id) {
        const c = db.creditos.find((x) => x.id === a.credito_id); c.status = 'disponivel'; c.agendamento_id = null
        return 'Cancelado. O crédito voltou para o seu saldo.'
      }
      return 'Cancelado. Pela regra de cancelamento, o crédito não foi devolvido.'
    }),
    solicitarAlteracao: (id, texto) => run(() => {
      const a = db.agendamentos.find((x) => x.id === id && x.dentista_id === db.sessao && x.status === 'agendado')
      if (!a) throw new Error('Agendamento não encontrado.')
      a.alteracao_solicitada = texto
    }),
    meusAgendamentos: () => run(() => db.agendamentos.filter((a) => a.dentista_id === db.sessao).sort((a, b) => b.inicio.localeCompare(a.inicio))),
    meusCreditos: () => run(() => db.creditos.filter((c) => c.dentista_id === db.sessao)),

    minhasCompras: () => run(() => db.compras.filter((c) => c.dentista_id === db.sessao).sort((a, b) => b.criado_em.localeCompare(a.criado_em))),
    compra: (id) => run(() => {
      const c = db.compras.find((x) => x.id === id && (x.dentista_id === db.sessao || ehAdmin()))
      if (!c) throw new Error('Compra não encontrada.')
      return c
    }),
    criarCompra: (comboId) => run(() => {
      const cb = db.combos.find((x) => x.id === comboId && x.ativo)
      if (!cb) throw new Error('Combo indisponível.')
      const promo = cb.preco_promocional != null && (!cb.promocao_ate || cb.promocao_ate >= hoje())
      const c = { id: uid(), dentista_id: db.sessao, combo_id: cb.id, combo_nome: cb.nome, qtd_creditos: cb.qtd_creditos, modalidade: cb.modalidade, validade_dias: cb.validade_dias, valor: promo ? cb.preco_promocional : cb.preco, status: 'pendente', gateway: 'manual', transacao_id: null, pix_copia_cola: null, pix_qr_base64: null, pago_em: null, nf_path: null, criado_em: new Date().toISOString() }
      db.compras.push(c); audit('compras', c.id, 'INSERT', c)
      return c
    }),
    gerarPix: (compraId) => run(() => {
      const c = db.compras.find((x) => x.id === compraId)
      c.gateway = 'demo'
      c.pix_copia_cola = `00020126580014BR.GOV.BCB.PIX0136DEMONSTRACAO-ORALSCAN-${c.id.slice(0, 8)}5204000053039865406${Number(c.valor).toFixed(2)}5802BR5909ORAL SCAN6009SAO PAULO62070503***6304ABCD`
      return { ok: true, compra: c, demo: true }
    }),
    // só no demo: simula o webhook do Mercado Pago confirmando o pagamento
    simularPagamento: (compraId) => run(() => liberar(db, compraId, 'DEMO-PIX-' + Date.now())),
    urlNota: async () => 'data:text/plain;charset=utf-8,' + encodeURIComponent('Nota fiscal de demonstração – Oral Scan'),

    agendamentos: ({ de, ate } = {}) => run(() => {
      exigeAdmin()
      return db.agendamentos
        .filter((a) => (!de || new Date(a.inicio) >= new Date(de)) && (!ate || new Date(a.inicio) < new Date(ate)))
        .sort((a, b) => a.inicio.localeCompare(b.inicio)).map(comDentista)
    }),
    dentistas: () => run(() => { exigeAdmin(); return [...db.perfis].sort((a, b) => a.nome.localeCompare(b.nome)) }),
    salvarDentista: (p) => run(() => { exigeAdmin(); Object.assign(db.perfis.find((x) => x.id === p.id), p); audit('perfis', p.id, 'UPDATE', p) }),
    criarDentista: (dados, senha) => run(() => {
      exigeAdmin()
      if (db.usuarios.some((u) => u.email === dados.email)) throw new Error('Este e-mail já tem cadastro.')
      const id = uid()
      db.usuarios.push({ id, email: dados.email, senha })
      db.perfis.push({ id, papel: 'dentista', ativo: true, ...dados, consentimento_lgpd: new Date().toISOString(), criado_em: new Date().toISOString() })
      return { precisaConfirmar: false }
    }),
    compras: () => run(() => { exigeAdmin(); return [...db.compras].sort((a, b) => b.criado_em.localeCompare(a.criado_em)).map(comDentista) }),
    creditos: () => run(() => { exigeAdmin(); return db.creditos }),
    bloqueios: () => run(() => { exigeAdmin(); return [...db.bloqueios].sort((a, b) => a.inicio.localeCompare(b.inicio)) }),
    salvarBloqueio: (b) => run(() => {
      exigeAdmin()
      if (new Date(b.fim) <= new Date(b.inicio)) throw new Error('O fim precisa ser depois do início.')
      const n = { id: uid(), criado_por: db.sessao, criado_em: new Date().toISOString(), ...b }
      db.bloqueios.push(n); audit('bloqueios', n.id, 'INSERT', n)
    }),
    excluirBloqueio: (id) => run(() => { exigeAdmin(); db.bloqueios = db.bloqueios.filter((b) => b.id !== id); audit('bloqueios', id, 'DELETE', null) }),
    liberarCompra: (id) => run(() => { exigeAdmin(); liberar(db, id, 'MANUAL'); audit('compras', id, 'UPDATE', { status: 'pago' }) }),
    estornarCompra: (id) => run(() => {
      exigeAdmin()
      const c = db.compras.find((x) => x.id === id && x.status === 'pago'); if (!c) return
      c.status = 'estornado'
      db.creditos.filter((x) => x.compra_id === id && x.status === 'disponivel').forEach((x) => { x.status = 'estornado' })
      audit('compras', id, 'UPDATE', { status: 'estornado' })
    }),
    cancelarCompra: (id) => run(() => { exigeAdmin(); const c = db.compras.find((x) => x.id === id && x.status === 'pendente'); if (c) c.status = 'cancelado' }),
    mudarStatus: (id, status) => run(() => { exigeAdmin(); const a = db.agendamentos.find((x) => x.id === id); if (a && a.status !== 'cancelado') a.status = status; audit('agendamentos', id, 'UPDATE', { status }) }),
    remarcar: (id, inicio) => run(() => {
      exigeAdmin()
      const a = db.agendamentos.find((x) => x.id === id)
      const dur = new Date(a.fim) - new Date(a.inicio), pre = new Date(a.inicio) - new Date(a.ocupa_ini), pos = new Date(a.ocupa_fim) - new Date(a.fim)
      const ini = new Date(inicio).getTime()
      const oIni = ini - pre, oFim = ini + dur + pos
      if (db.agendamentos.some((x) => x.id !== id && ['agendado', 'concluido'].includes(x.status) && new Date(x.ocupa_ini) < oFim && oIni < new Date(x.ocupa_fim))) throw new Error('Conflita com outro agendamento.')
      Object.assign(a, { inicio: new Date(ini).toISOString(), fim: new Date(ini + dur).toISOString(), ocupa_ini: new Date(oIni).toISOString(), ocupa_fim: new Date(oFim).toISOString(), alteracao_solicitada: null })
      audit('agendamentos', id, 'UPDATE', { inicio: a.inicio })
    }),
    anexarNota: (compra, arquivo) => run(() => { exigeAdmin(); db.compras.find((x) => x.id === compra.id).nf_path = `${compra.dentista_id}/${arquivo.name}` }),
    auditoria: () => run(() => { exigeAdmin(); return db.auditoria.slice(0, 300) }),
  }
}
