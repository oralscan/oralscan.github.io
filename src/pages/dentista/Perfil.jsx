import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useSessao } from '../../App.jsx'
import { Campo, CampoSenha, useAviso } from '../../components/ui.jsx'
import { CamposPerfil } from '../Acesso.jsx'

export default function Perfil() {
  const { perfil, recarregarPerfil } = useSessao()
  const avisar = useAviso()
  const [p, setP] = useState(perfil)
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  if (!p) return null

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try { await api.salvarPerfil(p); await recarregarPerfil(); avisar('Dados atualizados.') } catch (er) { avisar(er.message, 'erro') } finally { setSalvando(false) }
  }
  async function mudarContato(sim) {
    setSalvando(true)
    try {
      await api.salvarPerfil({ ...perfil, aceita_contato: sim })
      setP({ ...p, aceita_contato: sim })
      await recarregarPerfil()
      avisar(sim ? 'Pronto! Você vai receber nossas novidades.' : 'Pronto! Você não vai mais receber ofertas.')
    } catch (er) { avisar(er.message, 'erro') } finally { setSalvando(false) }
  }
  async function trocarSenha(e) {
    e.preventDefault()
    try { await api.novaSenha(senha); setSenha(''); avisar('Senha alterada.') } catch (er) { avisar(er.message, 'erro') }
  }

  return (
    <div className="pilha">
      <h1>Meu perfil</h1>
      <form className="cartao pilha" onSubmit={salvar}>
        <div className="suave pequeno">E-mail de acesso: <strong>{perfil.email}</strong></div>
        <CamposPerfil p={p} set={setP} comEmail={false} />
        <div><button className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar dados'}</button></div>
      </form>
      <div className="cartao pilha">
        <h2>Comunicações</h2>
        <label className="check">
          <input type="checkbox" checked={!!p.aceita_contato} disabled={salvando} onChange={(e) => mudarContato(e.target.checked)} />
          <span>Quero receber novidades, ofertas e convites da Oral Scan por WhatsApp e e-mail.</span>
        </label>
        <p className="pequeno suave" style={{ margin: 0 }}>
          Avisos sobre os seus agendamentos, pagamentos e notas fiscais continuam chegando normalmente, com ou sem esta opção.
        </p>
      </div>
      <form className="cartao pilha" onSubmit={trocarSenha}>
        <h2>Alterar senha</h2>
        <div className="form">
          <CampoSenha rotulo="Nova senha" dica="Mínimo de 6 caracteres" autoComplete="new-password" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div><button className="btn">Alterar senha</button></div>
      </form>
      <p className="pequeno suave">
        <Link to="/privacidade">Política de privacidade</Link> · Para solicitar a exclusão dos seus dados, fale com a clínica.
      </p>
    </div>
  )
}
