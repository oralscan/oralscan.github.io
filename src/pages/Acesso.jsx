import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { Campo, Marca, useAviso, useDados, Carregando } from '../components/ui.jsx'

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

function Moldura({ children }) {
  return (
    <div className="acesso">
      <div className="acesso-arte"><img src="./logo-completa.jpg" alt="Oral Scan – Dra. Tamires Bueno" /></div>
      <div className="acesso-form">
        <div className="acesso-caixa">
          <img className="acesso-logo" src="./logo-completa.jpg" alt="Oral Scan – Dra. Tamires Bueno" />
          {children}
        </div>
      </div>
    </div>
  )
}

export function Entrar() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  async function enviar(e) {
    e.preventDefault()
    setErro(''); setEnviando(true)
    try { await api.entrar(email.trim(), senha) } catch (er) { setErro(er.message) } finally { setEnviando(false) }
  }
  return (
    <Moldura>
      <div className="cartao">
        <h1>Entrar</h1>
        <p className="suave">Agende seus escaneamentos intraorais em poucos toques.</p>
        <form className="pilha" onSubmit={enviar}>
          <Campo rotulo="E-mail"><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
          <Campo rotulo="Senha"><input type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
          {erro && <div className="alerta alerta-erro">{erro}</div>}
          <button className="btn btn-primario btn-bloco" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <div className="linha-entre mt pequeno">
          <Link to="/recuperar">Esqueci minha senha</Link>
          <Link to="/cadastro"><strong>Criar cadastro</strong></Link>
        </div>
      </div>
    </Moldura>
  )
}

export const PERFIL_VAZIO = { nome: '', cro: '', cro_uf: 'SP', cpf_cnpj: '', clinica: '', telefone: '', whatsapp: '', email: '', endereco: '', bairro: '', cidade: '', cep: '' }

export function CamposPerfil({ p, set, comEmail = true }) {
  const m = (k) => (e) => set({ ...p, [k]: e.target.value })
  return (
    <div className="form">
      <Campo rotulo="Nome completo *" largo><input required value={p.nome} onChange={m('nome')} /></Campo>
      <Campo rotulo="CRO *"><input required value={p.cro} onChange={m('cro')} inputMode="numeric" /></Campo>
      <Campo rotulo="Estado do CRO *">
        <select required value={p.cro_uf} onChange={m('cro_uf')}>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
      </Campo>
      <Campo rotulo="CPF ou CNPJ da clínica *"><input required value={p.cpf_cnpj} onChange={m('cpf_cnpj')} inputMode="numeric" /></Campo>
      <Campo rotulo="Nome da clínica *"><input required value={p.clinica} onChange={m('clinica')} /></Campo>
      <Campo rotulo="Telefone"><input type="tel" value={p.telefone} onChange={m('telefone')} /></Campo>
      <Campo rotulo="WhatsApp *"><input type="tel" required value={p.whatsapp} onChange={m('whatsapp')} placeholder="(11) 99999-9999" /></Campo>
      {comEmail && <Campo rotulo="E-mail *"><input type="email" required value={p.email} onChange={m('email')} /></Campo>}
      <Campo rotulo="Endereço da clínica *" largo><input required value={p.endereco} onChange={m('endereco')} placeholder="Rua, número, sala" /></Campo>
      <Campo rotulo="Bairro"><input value={p.bairro} onChange={m('bairro')} /></Campo>
      <Campo rotulo="Cidade *"><input required value={p.cidade} onChange={m('cidade')} /></Campo>
      <Campo rotulo="CEP"><input value={p.cep} onChange={m('cep')} inputMode="numeric" /></Campo>
    </div>
  )
}

export function Cadastro() {
  const [p, setP] = useState(PERFIL_VAZIO)
  const [senha, setSenha] = useState('')
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (!aceite) return setErro('É preciso aceitar a política de privacidade.')
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    setEnviando(true)
    try {
      const r = await api.cadastrar({ ...p, email: p.email.trim().toLowerCase() }, senha)
      if (r.precisaConfirmar) setConfirmar(true)
    } catch (er) { setErro(er.message) } finally { setEnviando(false) }
  }
  if (confirmar) {
    return (
      <Moldura>
        <div className="cartao centro">
          <h2>Confira seu e-mail</h2>
          <p className="suave">Enviamos um link de confirmação para <strong>{p.email}</strong>. Depois de confirmar, é só entrar.</p>
          <Link className="btn btn-primario" to="/entrar">Ir para o login</Link>
        </div>
      </Moldura>
    )
  }
  return (
    <div className="conteudo" style={{ maxWidth: 760 }}>
      <div className="linha-entre mb"><Marca /><Link to="/entrar">Já tenho cadastro</Link></div>
      <div className="cartao">
        <h1>Cadastro profissional</h1>
        <p className="suave">Preencha seus dados para agendar escaneamentos.</p>
        <form className="pilha" onSubmit={enviar}>
          <CamposPerfil p={p} set={setP} />
          <div className="form">
            <Campo rotulo="Crie uma senha *" dica="Mínimo de 6 caracteres"><input type="password" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
          </div>
          <label className="check">
            <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
            <span>Li e aceito a <Link to="/privacidade" target="_blank">política de privacidade</Link> e autorizo o tratamento dos meus dados e dos dados dos pacientes que eu informar, exclusivamente para a prestação do serviço de escaneamento (LGPD).</span>
          </label>
          {erro && <div className="alerta alerta-erro">{erro}</div>}
          <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Criando…' : 'Criar cadastro'}</button>
        </form>
      </div>
    </div>
  )
}

export function Recuperar() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const avisar = useAviso()
  async function enviar(e) {
    e.preventDefault()
    try { await api.recuperarSenha(email.trim()); setEnviado(true) } catch (er) { avisar(er.message, 'erro') }
  }
  return (
    <Moldura>
      <div className="cartao">
        <h1>Recuperar senha</h1>
        {enviado ? (
          <p>Se houver cadastro com <strong>{email}</strong>, você receberá um link para criar uma nova senha.</p>
        ) : (
          <form className="pilha" onSubmit={enviar}>
            <Campo rotulo="E-mail"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
            <button className="btn btn-primario">Enviar link</button>
          </form>
        )}
        <p className="mt"><Link to="/entrar">Voltar ao login</Link></p>
      </div>
    </Moldura>
  )
}

export function NovaSenha() {
  const [senha, setSenha] = useState('')
  const avisar = useAviso()
  const nav = useNavigate()
  async function enviar(e) {
    e.preventDefault()
    try { await api.novaSenha(senha); avisar('Senha alterada.'); nav('/') } catch (er) { avisar(er.message, 'erro') }
  }
  return (
    <Moldura>
      <div className="cartao">
        <h1>Nova senha</h1>
        <form className="pilha" onSubmit={enviar}>
          <Campo rotulo="Nova senha" dica="Mínimo de 6 caracteres"><input type="password" minLength={6} required value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
          <button className="btn btn-primario">Salvar</button>
        </form>
      </div>
    </Moldura>
  )
}

export function Privacidade() {
  const { dados: cfg, carregando } = useDados(() => api.config().catch(() => null))
  return (
    <div className="conteudo" style={{ maxWidth: 760 }}>
      <div className="mb"><Marca /></div>
      <div className="cartao">
        <h1>Política de privacidade</h1>
        {carregando ? <Carregando /> : cfg?.politica_privacidade ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{cfg.politica_privacidade}</div>
        ) : (
          <div className="pilha">
            <p>A Oral Scan trata dados pessoais conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
            <p><strong>Dados coletados:</strong> dados profissionais do dentista (nome, CRO, CPF/CNPJ, contato e endereço) e dados do paciente necessários ao escaneamento (nome, telefone opcional, região/dentes e observações clínicas).</p>
            <p><strong>Finalidade:</strong> agendar e executar o escaneamento intraoral, emitir nota fiscal e comunicar confirmações, lembretes e alterações.</p>
            <p><strong>Compartilhamento:</strong> os dados não são vendidos nem compartilhados, exceto com o intermediador de pagamento (para processar o PIX) e quando exigido por lei.</p>
            <p><strong>Segurança:</strong> acesso individual com senha, controle por perfil (cada dentista vê apenas os próprios dados), conexão criptografada e cópias de segurança diárias.</p>
            <p><strong>Direitos:</strong> o titular pode solicitar acesso, correção ou exclusão dos dados pelo WhatsApp ou e-mail da clínica.</p>
            <p><strong>Responsabilidade do dentista:</strong> ao informar dados de pacientes, o dentista declara ter obtido o consentimento do paciente para o compartilhamento com a Oral Scan.</p>
          </div>
        )}
        <p className="mt"><Link to="/">Voltar</Link></p>
      </div>
    </div>
  )
}
