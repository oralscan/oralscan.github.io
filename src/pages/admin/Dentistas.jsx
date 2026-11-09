import { useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Modal, Selo, useAviso, useDados, Vazio } from '../../components/ui.jsx'
import { CamposPerfil, PERFIL_VAZIO } from '../Acesso.jsx'
import { hoje, dataCurta } from '../../lib/tempo.js'
import { resumoCreditos, linkWhats } from '../../lib/util.js'

export default function Dentistas() {
  const avisar = useAviso()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)
  const [novo, setNovo] = useState(null)
  const [senha, setSenha] = useState('')
  const { dados, carregando, recarregar } = useDados(async () => {
    const [perfis, creditos, ags] = await Promise.all([api.dentistas(), api.creditos(), api.agendamentos()])
    return { perfis, creditos, ags }
  })
  const lista = useMemo(() => {
    if (!dados) return []
    const b = busca.trim().toLowerCase()
    return dados.perfis.filter((p) => !b || [p.nome, p.clinica, p.cro, p.email, p.cidade].some((x) => (x || '').toLowerCase().includes(b)))
  }, [dados, busca])

  async function salvar(e) {
    e.preventDefault()
    try { await api.salvarDentista(editando); avisar('Cadastro atualizado.'); setEditando(null); recarregar() } catch (er) { avisar(er.message, 'erro') }
  }
  async function criar(e) {
    e.preventDefault()
    try {
      const r = await api.criarDentista({ ...novo, email: novo.email.trim().toLowerCase() }, senha)
      avisar(r.precisaConfirmar ? 'Cadastro criado. O dentista precisa confirmar o e-mail antes de entrar.' : 'Cadastro criado.')
      setNovo(null); setSenha(''); recarregar()
    } catch (er) { avisar(er.message, 'erro') }
  }
  const gerarSenha = () => setSenha(Math.random().toString(36).slice(2, 6) + Math.floor(1000 + Math.random() * 8999))

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><h1>Dentistas</h1><p>Profissionais cadastrados, créditos e histórico.</p></div>
        <button className="btn btn-primario" onClick={() => { setNovo({ ...PERFIL_VAZIO }); gerarSenha() }}>+ Cadastrar dentista</button>
      </div>
      <div className="filtros"><Campo rotulo="Buscar"><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, clínica, CRO, cidade" /></Campo></div>
      {carregando || !dados ? <Carregando /> : lista.length === 0 ? <div className="cartao"><Vazio titulo="Nenhum cadastro" /></div> : (
        <div className="tabela-caixa">
          <table>
            <thead><tr><th>Nome</th><th>CRO</th><th>Contato</th><th className="num">Créditos</th><th className="num">Agend.</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {lista.map((p) => {
                const r = resumoCreditos(dados.creditos.filter((c) => c.dentista_id === p.id), hoje())
                const n = dados.ags.filter((a) => a.dentista_id === p.id && a.status !== 'cancelado').length
                return (
                  <tr key={p.id}>
                    <td><strong>{p.nome || '(sem nome)'}</strong><div className="suave pequeno">{p.clinica}{p.cidade ? ` · ${p.cidade}` : ''}</div></td>
                    <td>{p.cro ? `${p.cro}/${p.cro_uf}` : '—'}</td>
                    <td className="pequeno">{p.email}<div>{p.whatsapp && <a href={linkWhats(p.whatsapp, `Olá, ${p.nome}!`)} target="_blank" rel="noopener">{p.whatsapp}</a>}</div></td>
                    <td className="num">{r.disponiveis}{r.vencidos > 0 && <div className="suave pequeno">{r.vencidos} venc.</div>}</td>
                    <td className="num">{n}</td>
                    <td>
                      {p.papel === 'admin' && <Selo cor="primaria">Admin</Selo>}{' '}
                      <Selo cor={p.ativo ? 'verde' : 'cinza'}>{p.ativo ? 'Ativo' : 'Inativo'}</Selo>
                      <div className="suave pequeno">desde {dataCurta(p.criado_em)}</div>
                    </td>
                    <td className="num"><button className="btn btn-pequeno" onClick={() => setEditando({ ...p })}>Editar</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal titulo="Editar cadastro" aberto={!!editando} fechar={() => setEditando(null)} largura={720}>
        {editando && (
          <form className="pilha" onSubmit={salvar}>
            <div className="suave pequeno">E-mail de acesso: {editando.email}</div>
            <CamposPerfil p={editando} set={setEditando} comEmail={false} />
            <div className="form">
              <Campo rotulo="Situação">
                <select value={editando.ativo ? '1' : '0'} onChange={(e) => setEditando({ ...editando, ativo: e.target.value === '1' })}>
                  <option value="1">Ativo – pode agendar</option><option value="0">Inativo – acesso bloqueado</option>
                </select>
              </Campo>
              <Campo rotulo="Perfil de acesso">
                <select value={editando.papel} onChange={(e) => setEditando({ ...editando, papel: e.target.value })}>
                  <option value="dentista">Dentista</option><option value="admin">Administrador(a)</option>
                </select>
              </Campo>
            </div>
            <div className="linha" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn btn-primario">Salvar</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal titulo="Cadastrar dentista" aberto={!!novo} fechar={() => setNovo(null)} largura={720}>
        {novo && (
          <form className="pilha" onSubmit={criar}>
            <CamposPerfil p={novo} set={setNovo} />
            <div className="form">
              <Campo rotulo="Senha inicial *" dica="Envie ao dentista; ele pode trocar no perfil.">
                <div className="linha" style={{ flexWrap: 'nowrap' }}>
                  <input required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
                  <button type="button" className="btn btn-pequeno" onClick={gerarSenha}>Gerar</button>
                </div>
              </Campo>
            </div>
            {novo.whatsapp && novo.email && senha && (
              <a className="btn btn-whats btn-pequeno" style={{ alignSelf: 'flex-start' }} target="_blank" rel="noopener"
                href={linkWhats(novo.whatsapp, `Olá, ${novo.nome}! Seu acesso ao app Oral Scan foi criado.\nLink: ${location.origin + location.pathname}\nE-mail: ${novo.email}\nSenha: ${senha}\n(Troque a senha em Perfil.)`)}>
                Enviar acesso pelo WhatsApp
              </a>
            )}
            <div className="linha" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setNovo(null)}>Cancelar</button>
              <button className="btn btn-primario">Criar cadastro</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
