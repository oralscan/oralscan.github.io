import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api } from './lib/api.js'
import { Carregando, Marca } from './components/ui.jsx'
import { Entrar, Cadastro, Recuperar, NovaSenha, Privacidade } from './pages/Acesso.jsx'
import Inicio from './pages/dentista/Inicio.jsx'
import Agendar from './pages/dentista/Agendar.jsx'
import MeusAgendamentos from './pages/dentista/MeusAgendamentos.jsx'
import Combos from './pages/dentista/Combos.jsx'
import Pagamento from './pages/dentista/Pagamento.jsx'
import Perfil from './pages/dentista/Perfil.jsx'
import Painel from './pages/admin/Painel.jsx'
import AgendaAdmin from './pages/admin/AgendaAdmin.jsx'
import AgendamentosAdmin from './pages/admin/AgendamentosAdmin.jsx'
import Bloqueios from './pages/admin/Bloqueios.jsx'
import Dentistas from './pages/admin/Dentistas.jsx'
import CombosAdmin from './pages/admin/CombosAdmin.jsx'
import Vendas from './pages/admin/Vendas.jsx'
import CreditosAdmin from './pages/admin/CreditosAdmin.jsx'
import Configuracoes from './pages/admin/Configuracoes.jsx'
import Historico from './pages/admin/Historico.jsx'

const SessaoCtx = createContext(null)
export const useSessao = () => useContext(SessaoCtx)

export default function App() {
  const [estado, setEstado] = useState({ pronto: false, usuario: null, perfil: null })

  const carregar = useCallback(async (usuario) => {
    if (!usuario) return setEstado({ pronto: true, usuario: null, perfil: null })
    try {
      const perfil = await api.meuPerfil()
      setEstado({ pronto: true, usuario, perfil })
    } catch {
      setEstado({ pronto: true, usuario, perfil: null })
    }
  }, [])

  useEffect(() => {
    api.sessao().then(carregar)
    return api.onAuth(carregar)
  }, [carregar])

  if (!estado.pronto) return <div className="tela-cheia"><Carregando /></div>

  const ctx = { ...estado, recarregarPerfil: () => carregar(estado.usuario) }
  const { usuario, perfil } = estado
  const admin = perfil?.papel === 'admin'

  return (
    <SessaoCtx.Provider value={ctx}>
      {api.demo && <FaixaDemo />}
      <Routes>
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/nova-senha" element={<NovaSenha />} />
        {!usuario ? (
          <>
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar" element={<Recuperar />} />
            <Route path="*" element={<Navigate to="/entrar" replace />} />
          </>
        ) : perfil && !perfil.ativo ? (
          <Route path="*" element={<Inativo />} />
        ) : admin ? (
          <Route element={<LayoutAdmin />}>
            <Route path="/admin" element={<Painel />} />
            <Route path="/admin/agenda" element={<AgendaAdmin />} />
            <Route path="/admin/agendamentos" element={<AgendamentosAdmin />} />
            <Route path="/admin/bloqueios" element={<Bloqueios />} />
            <Route path="/admin/dentistas" element={<Dentistas />} />
            <Route path="/admin/combos" element={<CombosAdmin />} />
            <Route path="/admin/vendas" element={<Vendas />} />
            <Route path="/admin/creditos" element={<CreditosAdmin />} />
            <Route path="/admin/config" element={<Configuracoes />} />
            <Route path="/admin/historico" element={<Historico />} />
            <Route path="/admin/perfil" element={<Perfil />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        ) : (
          <Route element={<LayoutDentista />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/agendar" element={<Agendar />} />
            <Route path="/agendamentos" element={<MeusAgendamentos />} />
            <Route path="/combos" element={<Combos />} />
            <Route path="/compra/:id" element={<Pagamento />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </SessaoCtx.Provider>
  )
}

function FaixaDemo() {
  return (
    <div className="faixa-demo">
      <span><strong>Modo demonstração</strong> — os dados ficam só neste navegador. Admin: admin@demo.com · Dentista: dentista@demo.com · senha demo123</span>
      <button onClick={() => api.resetarDemo()}>Recomeçar</button>
    </div>
  )
}

function Inativo() {
  return (
    <div className="tela-cheia">
      <div className="cartao" style={{ maxWidth: 420, textAlign: 'center' }}>
        <Marca />
        <h2>Cadastro inativo</h2>
        <p className="suave">Seu acesso está desativado. Fale com a clínica para liberar.</p>
        <button className="btn" onClick={() => api.sair()}>Sair</button>
      </div>
    </div>
  )
}

const ICONES = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  agendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></>,
  agenda: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M7 14h3M7 17h6" /></>,
  combos: <><path d="M4 7l8-4 8 4-8 4z" /><path d="M4 12l8 4 8-4M4 17l8 4 8-4" /></>,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
}
const Icone = ({ nome }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONES[nome]}</svg>
)

const MENU_DENTISTA = [
  ['/', 'Início', 'inicio'],
  ['/agendar', 'Agendar', 'agendar'],
  ['/agendamentos', 'Agenda', 'agenda'],
  ['/combos', 'Combos', 'combos'],
  ['/perfil', 'Perfil', 'perfil'],
]

function LayoutDentista() {
  const { perfil } = useSessao()
  return (
    <div className="app-dentista">
      <header className="topo">
        <Marca sub={false} />
        <div className="topo-dir">
          <span className="topo-nome">{perfil?.nome?.split(' ').slice(0, 2).join(' ')}</span>
          <button className="btn-link" onClick={() => api.sair()}>Sair</button>
        </div>
      </header>
      <main className="conteudo"><Outlet /></main>
      <nav className="abas">
        {MENU_DENTISTA.map(([to, rot, ic]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `aba ${isActive ? 'ativa' : ''}`}>
            <Icone nome={ic} />{rot}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

const MENU_ADMIN = [
  ['/admin', 'Painel'],
  ['/admin/agenda', 'Agenda'],
  ['/admin/agendamentos', 'Agendamentos'],
  ['/admin/bloqueios', 'Bloqueios'],
  ['/admin/dentistas', 'Dentistas'],
  ['/admin/combos', 'Combos e preços'],
  ['/admin/vendas', 'Vendas'],
  ['/admin/creditos', 'Créditos'],
  ['/admin/config', 'Configurações'],
  ['/admin/historico', 'Histórico'],
]

function LayoutAdmin() {
  const [aberto, setAberto] = useState(false)
  const { perfil } = useSessao()
  const nav = useNavigate()
  return (
    <div className="app-admin">
      <aside className={`lateral ${aberto ? 'aberta' : ''}`}>
        <div className="lateral-marca"><Marca /></div>
        <nav>
          {MENU_ADMIN.map(([to, rot]) => (
            <NavLink key={to} to={to} end onClick={() => setAberto(false)} className={({ isActive }) => `lateral-item ${isActive ? 'ativo' : ''}`}>{rot}</NavLink>
          ))}
        </nav>
        <div className="lateral-pe">
          <button className="btn-link" onClick={() => { setAberto(false); nav('/admin/perfil') }}>{perfil?.nome || 'Meu perfil'}</button>
          <button className="btn-link" onClick={() => api.sair()}>Sair</button>
        </div>
      </aside>
      {aberto && <div className="lateral-fundo" onClick={() => setAberto(false)} />}
      <div className="admin-principal">
        <header className="topo topo-admin">
          <button className="btn-icone menu-btn" onClick={() => setAberto(true)} aria-label="Abrir menu">☰</button>
          <Marca sub={false} />
        </header>
        <main className="conteudo conteudo-admin"><Outlet /></main>
      </div>
    </div>
  )
}
