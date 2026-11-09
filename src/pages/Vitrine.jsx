import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './vitrine.css'
import { linkWhats } from '../lib/util.js'

const WHATS_CLINICA = '14996772440'
const WHATS_LINK = linkWhats(WHATS_CLINICA, 'Olá! Vim pelo site do Oral Scan e gostaria de saber mais sobre o escaneamento intraoral.')

const IconeWhats = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"/></svg>
)

const SERVICOS = [
  ['Prótese', 'Coroas, onlays, overlays e próteses fixas sem moldagem convencional.'],
  ['Ortodontia', 'Documentação e planejamento ortodôntico com modelo digital.'],
  ['Estética', 'Facetas e reabilitação oral com registro preciso do sorriso.'],
  ['Implantodontia', 'Escaneamento de transferência e planejamento protético.'],
  ['Modelos e planejamento', 'Arquivos digitais prontos para o laboratório e para o seu fluxo.'],
]

const PASSOS = [
  ['Escolha um combo', 'Créditos de escaneamento com validade e preço por uso mais baixo.'],
  ['Pague por PIX', 'Assim que o pagamento é confirmado, os créditos entram na sua conta.'],
  ['Agende o horário', 'Só aparecem horários realmente livres — sem conflito, sem ligação.'],
  ['Escaneamento feito', 'A Dra. Tamires realiza o escaneamento e o crédito é baixado.'],
]

const DUVIDAS = [
  ['Com quanta antecedência preciso agendar?', 'Os horários abrem com pelo menos 48 horas de antecedência, para garantir a organização da agenda e o deslocamento quando o atendimento é no seu consultório.'],
  ['Vocês vão até o meu consultório?', 'Sim. Você escolhe entre atender na sede ou no seu consultório, dentro das regiões atendidas. O app já calcula o tempo de deslocamento e só mostra horários possíveis.'],
  ['Como funcionam os créditos?', 'Cada escaneamento usa um crédito. Os combos têm validade e você acompanha saldo, vencimento e histórico pelo app.'],
  ['Recebo nota fiscal?', 'Sim. A nota fiscal de cada compra fica disponível para download dentro do app.'],
  ['E se eu precisar remarcar?', 'Pelo app você solicita a alteração e a clínica confirma com você pelo WhatsApp.'],
  ['Meus dados e os dos pacientes estão protegidos?', 'Sim. O app segue a LGPD: os dados ficam em ambiente protegido e são usados apenas para o atendimento.'],
]

export default function Vitrine() {
  const [rolou, setRolou] = useState(false)
  useEffect(() => {
    const f = () => setRolou(window.scrollY > 420)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])

  return (
    <div className="vt">
      <header className="vt-topo">
        <div className="vt-largura vt-topo-in">
          <Link to="/" className="vt-marca" aria-label="Oral Scan – início">
            <img src="./icon.svg" alt="" width="36" height="36" />
            <span>
              <b>ORAL SCAN</b>
              <i>Dra. Tamires Bueno</i>
            </span>
          </Link>
          <nav className="vt-nav">
            <a href="#como-funciona" onClick={rolarPara('como-funciona')}>Como funciona</a>
            <a href="#servicos" onClick={rolarPara('servicos')}>Serviços</a>
            <a href="#duvidas" onClick={rolarPara('duvidas')}>Dúvidas</a>
          </nav>
          <div className="vt-topo-acoes">
            <Link to="/entrar" className="vt-link-entrar">Entrar</Link>
            <Link to="/cadastro" className="btn btn-primario btn-pequeno">Criar cadastro</Link>
          </div>
        </div>
      </header>

      {/* ---------- herói ---------- */}
      <section className="vt-heroi">
        <div className="vt-largura vt-heroi-grade">
          <div className="vt-heroi-texto">
            <span className="vt-selo"><span className="vt-ponto" /> Escaneamento intraoral para dentistas</span>
            <h1>Odontologia digital no seu consultório, <em>sem comprar o scanner.</em></h1>
            <p className="vt-lead">
              A Dra. Tamires Bueno leva o scanner intraoral até você — ou atende na sede.
              Você compra créditos, agenda pelo app e recebe o escaneamento pronto para o laboratório.
            </p>
            <div className="vt-ctas">
              <Link to="/cadastro" className="btn btn-primario vt-btn-grande">Quero agendar</Link>
              <a href="#como-funciona" className="btn vt-btn-grande" onClick={rolarPara('como-funciona')}>Ver como funciona</a>
            </div>
            <ul className="vt-credenciais">
              <li><b>Mestre e Doutora</b><span>em Dentística · FOB-USP</span></li>
              <li><b>Especialista</b><span>em Dentística · Centrinho</span></li>
              <li><b>CRO-SP</b><span>98.138</span></li>
            </ul>
          </div>

          <div className="vt-heroi-arte" aria-hidden="true">
            <div className="vt-orbita" />
            <div className="vt-celular">
              <div className="vt-cel-topo"><img src="./icon.svg" alt="" width="22" height="22" /><b>ORAL SCAN</b></div>
              <div className="vt-cel-credito">
                <small>Créditos disponíveis</small>
                <strong>8</strong>
                <span>Agendar escaneamento</span>
              </div>
              <div className="vt-cel-rotulo">Próximos escaneamentos</div>
              <div className="vt-cel-item"><div className="vt-cel-data"><b>14</b><small>nov</small></div><div><b>Paciente · Prótese</b><small>09:00 · No seu consultório</small></div></div>
              <div className="vt-cel-item"><div className="vt-cel-data"><b>18</b><small>nov</small></div><div><b>Paciente · Ortodontia</b><small>14:30 · Na sede</small></div></div>
              <div className="vt-cel-abas"><i /><i /><i /><i /></div>
            </div>
            <div className="vt-flutua vt-flutua-1"><span className="vt-check">✓</span><div><b>Pagamento confirmado</b><small>Créditos liberados</small></div></div>
            <div className="vt-flutua vt-flutua-2"><b>Horário reservado</b><small>Qui, 14 de nov · 09:00</small></div>
          </div>
        </div>
      </section>

      {/* ---------- faixa de especialidades ---------- */}
      <div className="vt-faixa">
        <div className="vt-largura vt-faixa-in">
          {SERVICOS.map(([n]) => <span key={n}>{n}</span>)}
        </div>
      </div>

      {/* ---------- como funciona ---------- */}
      <section id="como-funciona" className="vt-secao">
        <div className="vt-largura">
          <div className="vt-cabeca">
            <span className="vt-sobre">Como funciona</span>
            <h2>Do pagamento ao escaneamento em <em>quatro passos</em>.</h2>
            <p>Tudo pelo celular, sem ligações e sem planilhas. Você sempre sabe quantos créditos tem e quando é o próximo atendimento.</p>
          </div>
          <ol className="vt-passos">
            {PASSOS.map(([t, d], i) => (
              <li key={t}>
                <span className="vt-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- modalidades ---------- */}
      <section className="vt-secao vt-secao-nude">
        <div className="vt-largura">
          <div className="vt-cabeca">
            <span className="vt-sobre">Onde atendemos</span>
            <h2>Você escolhe onde o escaneamento acontece.</h2>
          </div>
          <div className="vt-modos">
            <article className="vt-modo">
              <div className="vt-modo-icone"><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg></div>
              <h3>Na sede</h3>
              <p>Traga seu paciente até a clínica, com estrutura completa e horários a cada 30 minutos.</p>
            </article>
            <article className="vt-modo vt-modo-destaque">
              <div className="vt-modo-icone"><svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg></div>
              <h3>No seu consultório</h3>
              <p>A Dra. Tamires vai até você com o scanner. Seu paciente fica no ambiente que já conhece e você não precisa investir no equipamento.</p>
              <span className="vt-tag">Sem investir em scanner</span>
            </article>
          </div>
        </div>
      </section>

      {/* ---------- serviços ---------- */}
      <section id="servicos" className="vt-secao">
        <div className="vt-largura">
          <div className="vt-cabeca">
            <span className="vt-sobre">Tipos de escaneamento</span>
            <h2>Um scanner, todas as <em>especialidades</em>.</h2>
          </div>
          <div className="vt-servicos">
            {SERVICOS.map(([n, d]) => (
              <article key={n} className="vt-servico">
                <h3>{n}</h3>
                <p>{d}</p>
              </article>
            ))}
            <article className="vt-servico vt-servico-cta">
              <h3>Por que digital?</h3>
              <ul>
                <li>Sem moldagem e mais conforto para o paciente</li>
                <li>Arquivo enviado direto ao laboratório</li>
                <li>Menos retrabalho e mais previsibilidade</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ---------- sobre ---------- */}
      <section className="vt-secao vt-secao-nude">
        <div className="vt-largura vt-sobre-grade">
          <div className="vt-monograma" aria-hidden="true"><span>TB</span></div>
          <div>
            <span className="vt-sobre">Quem atende</span>
            <h2>Dra. Tamires De Luccas Bueno</h2>
            <p className="vt-lead">
              Cirurgiã-dentista, especialista em Dentística pelo Centrinho e Mestre e Doutora em Dentística pela
              Faculdade de Odontologia de Bauru (FOB-USP). Une a precisão da odontologia digital ao cuidado com cada
              detalhe do seu caso.
            </p>
            <div className="vt-chips">
              <span>Graduada pela Unesp</span>
              <span>Mestrado e Doutorado · USP</span>
              <span>CRO-SP 98.138</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- dúvidas ---------- */}
      <section id="duvidas" className="vt-secao">
        <div className="vt-largura vt-duvidas-grade">
          <div className="vt-cabeca vt-cabeca-esq">
            <span className="vt-sobre">Dúvidas frequentes</span>
            <h2>Tudo o que você precisa saber antes de começar.</h2>
            <p>Ficou alguma dúvida? Fale direto com a clínica.</p>
            <a className="btn btn-whats" href={WHATS_LINK} target="_blank" rel="noopener noreferrer"><IconeWhats />Conversar no WhatsApp</a>
          </div>
          <div className="vt-duvidas">
            {DUVIDAS.map(([p, r]) => (
              <details key={p}>
                <summary>{p}<span className="vt-mais" aria-hidden="true" /></summary>
                <p>{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- chamada final ---------- */}
      <section className="vt-final">
        <div className="vt-largura vt-final-in">
          <h2>Pronto para levar o escaneamento digital ao seu consultório?</h2>
          <p>O cadastro leva menos de dois minutos. Depois é só escolher o combo e agendar.</p>
          <div className="vt-ctas">
            <Link to="/cadastro" className="btn vt-btn-claro vt-btn-grande">Criar meu cadastro</Link>
            <a href={WHATS_LINK} target="_blank" rel="noopener noreferrer" className="vt-link-claro">Tirar dúvidas no WhatsApp</a>
          </div>
        </div>
      </section>

      <footer className="vt-rodape">
        <div className="vt-largura vt-rodape-in">
          <span>© {new Date().getFullYear()} Oral Scan · Dra. Tamires Bueno · CRO-SP 98.138</span>
          <span className="vt-rodape-links"><a href={WHATS_LINK} target="_blank" rel="noopener noreferrer">WhatsApp (14) 99677-2440</a><Link to="/privacidade">Política de privacidade</Link></span>
        </div>
      </footer>

      {/* WhatsApp flutuante */}
      <a className={`vt-whats ${rolou ? 'subiu' : ''}`} href={WHATS_LINK} target="_blank" rel="noopener noreferrer" aria-label="Falar com a clínica no WhatsApp">
        <IconeWhats />
        <span>Fale com a clínica</span>
      </a>

      {/* barra fixa no celular */}
      <div className={`vt-barra-cel ${rolou ? 'visivel' : ''}`}>
        <Link to="/entrar" className="btn">Entrar</Link>
        <Link to="/cadastro" className="btn btn-primario">Quero agendar</Link>
      </div>
    </div>
  )
}

// HashRouter usa o "#" para as rotas, então a rolagem até as seções é feita na mão
function rolarPara(id) {
  return (e) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: reduzir ? 'auto' : 'smooth' })
  }
}
