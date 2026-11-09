import { createClient } from '@supabase/supabase-js'

export function criarApiSupabase(url, chave) {
  // lock próprio evita o travamento conhecido do supabase-js entre abas
  const sb = createClient(url, chave, {
    auth: { persistSession: true, autoRefreshToken: true, lock: async (_n, _t, fn) => fn() },
  })

  const ok = ({ data, error }) => {
    if (error) throw new Error(traduz(error.message))
    return data
  }

  const salva = async (tabela, { id, criado_em, ...resto }) =>
    ok(id ? await sb.from(tabela).update(resto).eq('id', id) : await sb.from(tabela).insert(resto))

  return {
    demo: false,

    // ---------- autenticação ----------
    async sessao() {
      const { data } = await sb.auth.getSession()
      return data.session?.user ?? null
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => setTimeout(() => cb(s?.user ?? null), 0))
      return () => data.subscription.unsubscribe()
    },
    async entrar(email, senha) {
      ok(await sb.auth.signInWithPassword({ email, password: senha }))
    },
    async cadastrar(dados, senha) {
      const { email, ...meta } = dados
      const r = ok(await sb.auth.signUp({
        email, password: senha,
        options: { data: { ...meta, consentimento: 'true' }, emailRedirectTo: location.origin + location.pathname },
      }))
      return { precisaConfirmar: !r.session }
    },
    async sair() { await sb.auth.signOut() },
    async recuperarSenha(email) {
      ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '#/nova-senha' }))
    },
    async novaSenha(senha) { ok(await sb.auth.updateUser({ password: senha })) },

    // ---------- perfil ----------
    async meuPerfil() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return null
      return ok(await sb.from('perfis').select('*').eq('id', user.id).single())
    },
    async salvarPerfil(p) {
      const { id, papel, ativo, criado_em, email, ...resto } = p
      ok(await sb.from('perfis').update(resto).eq('id', id))
    },

    // ---------- cadastros gerais ----------
    async config() { return ok(await sb.from('config').select('*').eq('id', 1).single()) },
    async salvarConfig(c) { ok(await sb.from('config').update(c).eq('id', 1)) },
    async servicos() { return ok(await sb.from('servicos').select('*').order('ordem')) },
    async salvarServico(s) { await salva('servicos', s) },
    async regioes() { return ok(await sb.from('regioes').select('*').order('nome')) },
    async salvarRegiao(r) { await salva('regioes', r) },
    async excluirRegiao(id) { ok(await sb.from('regioes').update({ ativo: false }).eq('id', id)) },
    async combos() { return ok(await sb.from('combos').select('*').order('preco')) },
    async salvarCombo(c) { await salva('combos', c) },

    // ---------- agenda ----------
    async ocupacao(de, ate) {
      return ok(await sb.rpc('ocupacao', { de: new Date(de).toISOString(), ate: new Date(ate).toISOString() }))
    },
    async agendar(p) {
      return ok(await sb.rpc('agendar', {
        p_servico: p.servico_id, p_modalidade: p.modalidade, p_inicio: new Date(p.inicio).toISOString(),
        p_paciente_nome: p.paciente_nome, p_paciente_telefone: p.paciente_telefone || '',
        p_dentes: p.dentes_regiao || '', p_obs: p.observacoes || '',
        p_endereco: p.endereco || '', p_regiao: p.regiao_id || null, p_dentista: p.dentista_id || null,
      }))
    },
    async cancelar(id, motivo = '', devolver = null) {
      return ok(await sb.rpc('cancelar_agendamento', { p_id: id, p_motivo: motivo, p_devolver: devolver }))
    },
    async solicitarAlteracao(id, texto) { ok(await sb.rpc('solicitar_alteracao', { p_id: id, p_texto: texto })) },
    async meusAgendamentos() {
      return ok(await sb.from('agendamentos').select('*').order('inicio', { ascending: false }))
    },
    async meusCreditos() { return ok(await sb.from('creditos').select('*')) },

    // ---------- compras ----------
    async minhasCompras() { return ok(await sb.from('compras').select('*').order('criado_em', { ascending: false })) },
    async compra(id) { return ok(await sb.from('compras').select('*').eq('id', id).single()) },
    async criarCompra(comboId) { return ok(await sb.rpc('criar_compra', { p_combo: comboId })) },
    async gerarPix(compraId) {
      const { data, error } = await sb.functions.invoke('pix-criar', { body: { compra_id: compraId } })
      if (error) {
        let msg = error.message
        try { msg = (await error.context.json()).erro || msg } catch { /* sem corpo */ }
        return { erro: msg }
      }
      return data
    },
    async urlNota(path) {
      return ok(await sb.storage.from('notas').createSignedUrl(path, 120)).signedUrl
    },

    // ---------- administração ----------
    async agendamentos({ de, ate } = {}) {
      let q = sb.from('agendamentos').select('*, dentista:perfis(nome, clinica, whatsapp, telefone, email)').order('inicio')
      if (de) q = q.gte('inicio', new Date(de).toISOString())
      if (ate) q = q.lt('inicio', new Date(ate).toISOString())
      return ok(await q)
    },
    async dentistas() { return ok(await sb.from('perfis').select('*').order('nome')) },
    async salvarDentista(p) {
      const { criado_em, email, ...resto } = p
      ok(await sb.from('perfis').update(resto).eq('id', p.id))
    },
    async criarDentista(dados, senha) {
      // cliente separado e sem sessão: não desloga o administrador
      const tmp = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'tmp-cadastro' } })
      const { email, ...meta } = dados
      const r = await tmp.auth.signUp({ email, password: senha, options: { data: { ...meta, consentimento: 'true' } } })
      if (r.error) throw new Error(traduz(r.error.message))
      return { precisaConfirmar: !r.data.session }
    },
    async compras() {
      return ok(await sb.from('compras').select('*, dentista:perfis(nome, clinica, email, whatsapp, telefone)').order('criado_em', { ascending: false }))
    },
    async creditos() { return ok(await sb.from('creditos').select('*')) },
    async bloqueios() { return ok(await sb.from('bloqueios').select('*').order('inicio')) },
    async salvarBloqueio(b) {
      const { data: { user } } = await sb.auth.getUser()
      ok(await sb.from('bloqueios').insert({ ...b, criado_por: user.id }))
    },
    async excluirBloqueio(id) { ok(await sb.from('bloqueios').delete().eq('id', id)) },
    async liberarCompra(id) { ok(await sb.rpc('liberar_compra', { p_compra: id, p_transacao: null })) },
    async estornarCompra(id) { ok(await sb.rpc('estornar_compra', { p_compra: id })) },
    async cancelarCompra(id) { ok(await sb.from('compras').update({ status: 'cancelado' }).eq('id', id).eq('status', 'pendente')) },
    async mudarStatus(id, status) { ok(await sb.rpc('mudar_status_agendamento', { p_id: id, p_status: status })) },
    async remarcar(id, inicio) { ok(await sb.rpc('remarcar', { p_id: id, p_inicio: new Date(inicio).toISOString() })) },
    async anexarNota(compra, arquivo) {
      const ext = (arquivo.name.split('.').pop() || 'pdf').toLowerCase()
      const path = `${compra.dentista_id}/${compra.id}.${ext}`
      ok(await sb.storage.from('notas').upload(path, arquivo, { upsert: true }))
      ok(await sb.from('compras').update({ nf_path: path }).eq('id', compra.id))
    },
    async auditoria() {
      return ok(await sb.from('auditoria').select('*').order('em', { ascending: false }).limit(300))
    },
  }
}

function traduz(m = '') {
  if (m.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('Email not confirmed')) return 'Confirme seu e-mail pelo link enviado antes de entrar.'
  if (m.includes('User already registered')) return 'Este e-mail já tem cadastro.'
  if (m.includes('Password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
  return m
}
