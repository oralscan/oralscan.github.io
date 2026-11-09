import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { Campo, CampoSenha, Marca, useAviso, useDados, Carregando } from '../components/ui.jsx'
import { mascaraDoc, mascaraFone, mascaraCep, validarDoc, soDigitos } from '../lib/util.js'

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

function Moldura({ children }) {
  return (
    <div className="acesso">
      <div className="acesso-arte">
        <span className="arte-circulo c1" /><span className="arte-circulo c2" /><span className="arte-circulo c3" />
        <div className="arte-conteudo">
          <img src="./icon.svg" alt="" />
          <div className="marca-nome">ORAL SCAN</div>
          <div className="marca-sub">Dra. Tamires Bueno</div>
          <h2 className="arte-titulo">Escaneamento intraoral com <em>precisão</em> e cuidado.</h2>
          <p className="suave">Agende, acompanhe e organize seus escaneamentos em um só lugar.</p>
          <ul className="arte-lista">
            <li>Na clínica ou no seu consultório</li>
            <li>Horários reais, sem conflito de agenda</li>
            <li>Créditos e notas fiscais sempre à mão</li>
          </ul>
        </div>
      </div>
      <div className="acesso-form">
        <div className="acesso-caixa">
          <Link to="/" className="acesso-voltar">← Conhecer o Oral Scan</Link>
          <div className="acesso-topo">
            <img src="./icon.svg" alt="" />
            <div className="marca-nome">ORAL SCAN</div>
            <div className="marca-sub">Dra. Tamires Bueno</div>
          </div>
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
          <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} />
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

export const PERFIL_VAZIO = { nome: '', cro: '', cro_uf: 'SP', cpf_cnpj: '', clinica: '', telefone: '', whatsapp: '', email: '', endereco: '', bairro: '', cidade: '', cep: '', aceita_contato: false }

export function CamposPerfil({ p, set, comEmail = true }) {
  const m = (k, mascara) => (e) => set({ ...p, [k]: mascara ? mascara(e.target.value) : e.target.value })
  return (
    <div className="form">
      <Campo rotulo="Nome completo *" largo><input required value={p.nome} onChange={m('nome')} /></Campo>
      <Campo rotulo="CRO *"><input required value={p.cro} onChange={m('cro')} inputMode="numeric" /></Campo>
      <Campo rotulo="Estado do CRO *">
        <select required value={p.cro_uf} onChange={m('cro_uf')}>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
      </Campo>
      <CampoDoc valor={p.cpf_cnpj} onChange={m('cpf_cnpj', mascaraDoc)} />
      <Campo rotulo="Nome da clínica *"><input required value={p.clinica} onChange={m('clinica')} /></Campo>
      <Campo rotulo="Telefone"><input type="tel" inputMode="tel" value={mascaraFone(p.telefone)} onChange={m('telefone', mascaraFone)} placeholder="(14) 3333-4444" /></Campo>
      <Campo rotulo="WhatsApp *"><input type="tel" inputMode="tel" required value={mascaraFone(p.whatsapp)} onChange={m('whatsapp', mascaraFone)} placeholder="(14) 99999-9999" /></Campo>
      {comEmail && <Campo rotulo="E-mail *"><input type="email" required value={p.email} onChange={m('email')} /></Campo>}
      <Campo rotulo="Endereço da clínica *" largo><input required value={p.endereco} onChange={m('endereco')} placeholder="Rua, número, sala" /></Campo>
      <Campo rotulo="Bairro"><input value={p.bairro} onChange={m('bairro')} /></Campo>
      <Campo rotulo="Cidade *"><input required value={p.cidade} onChange={m('cidade')} /></Campo>
      <Campo rotulo="CEP"><input value={mascaraCep(p.cep)} onChange={m('cep', mascaraCep)} inputMode="numeric" placeholder="00000-000" /></Campo>
    </div>
  )
}

// Só avisa: nunca impede o cadastro (o número pode ser conferido depois pela clínica)
function CampoDoc({ valor, onChange }) {
  const texto = mascaraDoc(valor)
  const estado = validarDoc(texto)
  const qtd = soDigitos(texto).length
  const dica = estado === 'invalido' ? <span className="dica-aviso">Confira os dígitos — parece haver um número trocado.</span>
    : estado === 'ok' ? <span className="dica-ok">{qtd === 11 ? 'CPF' : 'CNPJ'} válido</span>
    : 'Só números — a pontuação entra sozinha.'
  return (
    <Campo rotulo="CPF ou CNPJ da clínica *" dica={dica}>
      <input required value={texto} onChange={onChange} inputMode="numeric" placeholder="000.000.000-00" maxLength={18} />
    </Campo>
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
      <div className="linha-entre mb"><Link to="/" style={{ textDecoration: 'none' }} aria-label="Voltar ao início"><Marca /></Link><Link to="/entrar">Já tenho cadastro</Link></div>
      <div className="cartao">
        <h1>Cadastro profissional</h1>
        <p className="suave">Preencha seus dados para agendar escaneamentos.</p>
        <form className="pilha" onSubmit={enviar}>
          <CamposPerfil p={p} set={setP} />
          <div className="form">
            <CampoSenha rotulo="Crie uma senha *" dica="Mínimo de 6 caracteres" autoComplete="new-password" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <div className="aceites">
            <label className="check">
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              <span><strong>Obrigatório:</strong> li e aceito a <Link to="/privacidade" target="_blank">política de privacidade</Link> e autorizo o tratamento dos meus dados e dos dados dos pacientes que eu informar para agendar e realizar os escaneamentos, emitir nota fiscal e enviar avisos sobre os meus atendimentos (LGPD).</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={!!p.aceita_contato} onChange={(e) => setP({ ...p, aceita_contato: e.target.checked })} />
              <span><strong>Opcional:</strong> quero receber novidades, ofertas e convites da Oral Scan por WhatsApp e e-mail. Posso cancelar quando quiser em "Meu perfil".</span>
            </label>
          </div>
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
          <CampoSenha rotulo="Nova senha" dica="Mínimo de 6 caracteres" autoComplete="new-password" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
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
            <p><strong>Comunicações comerciais (opcional):</strong> somente se o dentista autorizar no cadastro ou em "Meu perfil", seus dados de contato (nome, clínica, WhatsApp e e-mail) podem ser usados pela Oral Scan para enviar novidades, ofertas e convites. A autorização é separada do aceite desta política, não é condição para usar o app e pode ser cancelada a qualquer momento em "Meu perfil" ou pelo WhatsApp da clínica. Dados de pacientes nunca são usados para esse fim.</p>
            <p><strong>Armazenamento:</strong> os dados ficam no banco de dados do app e em planilha de controle interno da clínica (Google), com acesso restrito à equipe da Oral Scan.</p>
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
