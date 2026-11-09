import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './tutorial.css'

/*
 * Vídeo tutorial animado do app (sem arquivo de vídeo): um "celular" mostra as telas
 * do dentista sendo usadas, com cursor, toques e legendas.
 * Cada cena tem batidas (em segundos); em cada batida o cursor vai até um alvo (data-alvo)
 * e a tela muda de estado.
 */

const LARG = 300   // tamanho virtual do celular; o desenho é escalado para caber
const ALT = 560
const VELOCIDADE = 1.4 // >1 = mais rápido (o roteiro continua escrito em segundos "normais")

function roteiro({ antecedencia = 48, cancelamento = 24 }) {
  return [
    {
      id: 'inicio', titulo: 'Seu painel', dur: 8, tela: 'inicio', aba: 0,
      batidas: [
        { em: 0, alvo: 'creditos', legenda: 'Este é o seu painel: créditos disponíveis e próximos escaneamentos.' },
        { em: 4.2, alvo: 'nf', legenda: 'Por aqui você também baixa as notas fiscais das suas compras.' },
      ],
    },
    {
      id: 'combos', titulo: 'Comprar créditos', dur: 9.5, tela: 'combos', aba: 3,
      batidas: [
        { em: 0, alvo: 'aba-3', toque: true, legenda: 'Cada escaneamento usa um crédito. Em Combos você escolhe o pacote.' },
        { em: 3.4, alvo: 'combo-5', legenda: 'Quanto maior o combo, menor o preço de cada escaneamento.' },
        { em: 6.6, alvo: 'comprar-5', toque: true, estado: { comprando: true }, legenda: 'Toque em Comprar para gerar o PIX.' },
      ],
    },
    {
      id: 'pix', titulo: 'Pagamento por PIX', dur: 10, tela: 'pix', aba: 3,
      batidas: [
        { em: 0, alvo: 'qr', legenda: 'Pague com o QR Code ou com o PIX copia e cola.' },
        { em: 2.6, alvo: 'copiar', toque: true, estado: { copiado: true }, legenda: 'Um toque copia o código para colar no app do banco.' },
        { em: 5.2, alvo: 'comprovante', legenda: 'Se quiser, envie o comprovante pelo WhatsApp da clínica.' },
        { em: 7.6, alvo: 'status', estado: { pago: true }, legenda: 'Pagamento confirmado: os créditos entram na sua conta.' },
      ],
    },
    {
      id: 'tipo', passo: 1, titulo: '1. Tipo de escaneamento', dur: 8, tela: 'tipo', aba: 1,
      batidas: [
        { em: 0, alvo: 'aba-1', toque: true, legenda: 'Em Agendar, comece escolhendo o tipo de escaneamento.' },
        { em: 3.2, alvo: 'srv-0', legenda: 'Prótese, ortodontia, estética, implantodontia ou modelos — cada um com seu tempo.' },
        { em: 6, alvo: 'srv-0', toque: true, estado: { marcado: 0 }, legenda: 'Toque no tipo para seguir.' },
      ],
    },
    {
      id: 'local', passo: 2, titulo: '2. Local do atendimento', dur: 10, tela: 'local', aba: 1,
      batidas: [
        { em: 0, alvo: 'sede', legenda: 'Escolha o local: na sede da clínica…' },
        { em: 2.6, alvo: 'externo', toque: true, estado: { externo: true }, legenda: '…ou na sua própria clínica: a Dra. Tamires vai até você com o scanner.' },
        { em: 6, alvo: 'regiao', estado: { externo: true, regiao: true }, legenda: 'Informe a região e o endereço onde será o atendimento.' },
        { em: 8.4, alvo: 'continuar', toque: true, estado: { externo: true, regiao: true }, legenda: 'E toque em Continuar.' },
      ],
    },
    {
      id: 'horario', passo: 3, titulo: '3. Dia e horário', dur: 10, tela: 'horario', aba: 1,
      batidas: [
        { em: 0, alvo: 'dias', legenda: `Aparecem só horários realmente livres, com ${antecedencia} h de antecedência.` },
        { em: 3, alvo: 'dia-2', toque: true, estado: { dia: 2 }, legenda: 'Escolha o dia: o número mostra quantos horários estão livres.' },
        { em: 6, alvo: 'hora-1', toque: true, estado: { dia: 2, hora: 1 }, legenda: 'Depois o horário. O deslocamento até você já está descontado.' },
      ],
    },
    {
      id: 'paciente', passo: 4, titulo: '4. Dados do paciente', dur: 9, tela: 'paciente', aba: 1,
      batidas: [
        { em: 0, alvo: 'nome', estado: { digitando: 'nome' }, legenda: 'Informe o nome do paciente.' },
        { em: 3.6, alvo: 'dentes', estado: { digitando: 'dentes' }, legenda: 'Se quiser, a região ou os dentes e observações do caso.' },
        { em: 7.2, alvo: 'revisar', toque: true, estado: { digitando: 'fim' }, legenda: 'Toque em Revisar.' },
      ],
    },
    {
      id: 'confirmar', passo: 5, titulo: '5. Confirmar', dur: 10, tela: 'confirmar', aba: 1,
      batidas: [
        { em: 0, alvo: 'resumo', legenda: 'Confira tudo: data, horário, local e o crédito que será usado.' },
        { em: 3.8, alvo: 'confirmar', toque: true, legenda: 'Toque em Confirmar agendamento.' },
        { em: 5, alvo: 'whats', estado: { feito: true }, legenda: 'Pronto! Agendado. Se quiser, avise a clínica pelo WhatsApp.' },
      ],
    },
    {
      id: 'agenda', titulo: 'Minha agenda', dur: 10, tela: 'agenda', aba: 2,
      batidas: [
        { em: 0, alvo: 'aba-2', toque: true, legenda: 'Em Agenda ficam os próximos escaneamentos e o histórico.' },
        { em: 3.4, alvo: 'alterar', legenda: 'Precisa mudar algo? Toque em Solicitar alteração.' },
        { em: 6.6, alvo: 'cancelar', legenda: `Cancelando com mais de ${cancelamento} h de antecedência, o crédito volta para você.` },
      ],
    },
    {
      id: 'perfil', titulo: 'Seu perfil', dur: 8.5, tela: 'perfil', aba: 4,
      batidas: [
        { em: 0, alvo: 'aba-4', toque: true, legenda: 'Em Perfil você atualiza seus dados e troca a senha.' },
        { em: 4, alvo: 'ofertas', toque: true, estado: { ofertas: true }, legenda: 'E escolhe se quer receber novidades e ofertas da clínica.' },
      ],
    },
    {
      id: 'fim', titulo: 'Pronto!', dur: 6, tela: 'fim', aba: 0,
      batidas: [
        { em: 0, alvo: 'fim', semCursor: true, legenda: 'É isso! Qualquer dúvida, fale com a clínica pelo WhatsApp. Bons escaneamentos!' },
      ],
    },
  ]
}

const SERVICOS = [['Prótese', 30], ['Ortodontia', 30], ['Estética', 40], ['Implantodontia', 40], ['Modelos e planejamento', 30]]

function digitado(texto, t, inicio, velocidade = 12) {
  const n = Math.max(0, Math.floor((t - inicio) * velocidade))
  return texto.slice(0, n)
}

/* ---------------- telas (desenho simplificado do app) ---------------- */
function Tela({ cena, estado, t }) {
  switch (cena.tela) {
    case 'inicio':
      return (
        <div className="tv-pilha">
          <div className="tv-titulo">Olá, Rafael</div>
          <div className="tv-destaque" data-alvo="creditos">
            <small>Créditos disponíveis</small><b>4</b>
            <span className="tv-btn tv-btn-claro">Agendar escaneamento</span>
          </div>
          <div className="tv-cartao">
            <div className="tv-sub">Próximos escaneamentos</div>
            <ItemAg dia="14" mes="nov" nome="Mariana Alves" info="09:00 · Prótese · Na sede" />
          </div>
          <div className="tv-cartao tv-linha" data-alvo="nf">
            <span><b>Combo 5</b><small className="tv-selo tv-verde">Pago</small></span>
            <span className="tv-btn tv-btn-mini">Baixar NF</span>
          </div>
        </div>
      )
    case 'combos':
      return (
        <div className="tv-pilha">
          <div className="tv-titulo">Combos</div>
          {[['Avulso', 1, ''], ['Combo 5', 5, 'Popular'], ['Combo 10', 10, 'Melhor preço']].map(([n, q, v]) => (
            <div key={n} className={`tv-cartao ${q === 5 ? 'tv-realce' : ''}`} data-alvo={`combo-${q}`}>
              <div className="tv-linha">
                <span><b>{n}</b><small>{q} escaneamento{q > 1 ? 's' : ''}</small></span>
                {v && <span className="tv-selo tv-rose">{v}</span>}
              </div>
              <span className={`tv-btn ${q === 5 ? 'tv-btn-primario' : ''} ${q === 5 && estado.comprando ? 'tv-apertado' : ''}`} data-alvo={`comprar-${q}`}>Comprar</span>
            </div>
          ))}
        </div>
      )
    case 'pix':
      return (
        <div className="tv-pilha">
          <div className="tv-titulo">Pagamento</div>
          <div className="tv-cartao tv-centro">
            <div className="tv-sub">Combo 5 · PIX</div>
            <div className="tv-qr" data-alvo="qr">{Array.from({ length: 49 }, (_, i) => <i key={i} className={(i * 7 + i * i) % 3 ? 'on' : ''} />)}</div>
            <span className={`tv-btn ${estado.copiado ? 'tv-btn-ok' : ''}`} data-alvo="copiar">{estado.copiado ? '✓ Código copiado' : 'Copiar PIX copia e cola'}</span>
            <span className="tv-btn tv-btn-whats" data-alvo="comprovante">Enviar comprovante</span>
          </div>
          <div className={`tv-status ${estado.pago ? 'pago' : ''}`} data-alvo="status">
            {estado.pago ? '✓ Pagamento confirmado · 5 créditos liberados' : '⏳ Aguardando pagamento…'}
          </div>
        </div>
      )
    case 'tipo':
      return (
        <div className="tv-pilha">
          <Passos n={1} />
          <div className="tv-sub">1. Tipo de escaneamento</div>
          {SERVICOS.map(([n, m], i) => (
            <div key={n} className={`tv-opcao ${estado.marcado === i ? 'marcada' : ''}`} data-alvo={`srv-${i}`}>
              <b>{n}</b><small>⏱ {m} min</small>
            </div>
          ))}
        </div>
      )
    case 'local':
      return (
        <div className="tv-pilha">
          <Passos n={2} />
          <div className="tv-sub">2. Local do atendimento</div>
          <div className="tv-opcao" data-alvo="sede"><b>Na sede</b><small>Você leva o paciente até o scanner.</small></div>
          <div className={`tv-opcao ${estado.externo ? 'marcada' : ''}`} data-alvo="externo"><b>Na minha clínica</b><small>A profissional vai até você.</small></div>
          {estado.externo && (
            <div className="tv-campos tv-entra" data-alvo="regiao">
              <label>Região</label><div className="tv-input">{estado.regiao ? 'Bauru – Centro' : 'Selecione…'}</div>
              <label>Endereço</label><div className="tv-input">{estado.regiao ? digitado('Rua das Flores, 120', t, 6.2, 18) : ''}</div>
            </div>
          )}
          <span className="tv-btn tv-btn-primario tv-direita" data-alvo="continuar">Continuar</span>
        </div>
      )
    case 'horario':
      return (
        <div className="tv-pilha">
          <Passos n={3} />
          <div className="tv-sub">3. Dia e horário</div>
          <div className="tv-dias" data-alvo="dias">
            {[['qui', 13, 0], ['sex', 14, 3], ['seg', 17, 6], ['ter', 18, 4]].map(([s, d, l], i) => (
              <div key={d} className={`tv-dia ${estado.dia === i ? 'marcado' : ''} ${l === 0 ? 'off' : ''}`} data-alvo={`dia-${i}`}>
                <small>{s}</small><b>{d}</b>{l > 0 && <em>{l} livres</em>}
              </div>
            ))}
          </div>
          {estado.dia === 2 && (
            <div className="tv-horas tv-entra">
              {['08:30', '09:00', '10:30', '14:00', '15:30', '16:00'].map((h, i) => (
                <span key={h} className={`tv-hora ${estado.hora === i ? 'marcada' : ''}`} data-alvo={`hora-${i}`}>{h}</span>
              ))}
            </div>
          )}
        </div>
      )
    case 'paciente': {
      const nome = estado.digitando ? digitado('Maria Silva', t, 0.6) : ''
      const dentes = estado.digitando === 'dentes' || estado.digitando === 'fim' ? digitado('36, 37 · coroa', t, 4) : ''
      return (
        <div className="tv-pilha">
          <Passos n={4} />
          <div className="tv-sub">4. Dados do paciente</div>
          <div className="tv-campos">
            <label>Nome do paciente *</label>
            <div className={`tv-input ${estado.digitando === 'nome' ? 'foco' : ''}`} data-alvo="nome">{nome}{estado.digitando === 'nome' && <i className="tv-caret" />}</div>
            <label>Telefone (opcional)</label><div className="tv-input" />
            <label>Região ou dentes</label>
            <div className={`tv-input ${estado.digitando === 'dentes' ? 'foco' : ''}`} data-alvo="dentes">{dentes}{estado.digitando === 'dentes' && <i className="tv-caret" />}</div>
            <label>Observações</label><div className="tv-input tv-area" />
          </div>
          <span className="tv-btn tv-btn-primario tv-direita" data-alvo="revisar">Revisar</span>
        </div>
      )
    }
    case 'confirmar':
      if (estado.feito) {
        return (
          <div className="tv-pilha tv-centro tv-sucesso tv-entra">
            <div className="tv-check">✓</div>
            <div className="tv-titulo">Agendamento confirmado!</div>
            <small>sexta, 17 de nov · 09:00 · Prótese<br />Paciente: Maria Silva</small>
            <span className="tv-btn tv-btn-whats" data-alvo="whats">Enviar confirmação no WhatsApp</span>
          </div>
        )
      }
      return (
        <div className="tv-pilha">
          <Passos n={5} />
          <div className="tv-sub">5. Confirme o agendamento</div>
          <dl className="tv-resumo" data-alvo="resumo">
            <dt>Escaneamento</dt><dd>Prótese (30 min)</dd>
            <dt>Data</dt><dd>sexta, 17 de nov</dd>
            <dt>Horário</dt><dd>09:00</dd>
            <dt>Local</dt><dd>Rua das Flores, 120</dd>
            <dt>Paciente</dt><dd>Maria Silva</dd>
            <dt>Crédito</dt><dd>4 → 3</dd>
          </dl>
          <span className="tv-btn tv-btn-primario tv-largo" data-alvo="confirmar">Confirmar agendamento</span>
        </div>
      )
    case 'agenda':
      return (
        <div className="tv-pilha">
          <div className="tv-titulo">Meus agendamentos</div>
          <div className="tv-pilulas"><span className="on">Próximos (2)</span><span>Anteriores</span></div>
          <div className="tv-cartao">
            <ItemAg dia="17" mes="nov" nome="Maria Silva" info="09:00 · Prótese · Na sua clínica" />
            <div className="tv-acoes">
              <span className="tv-btn tv-btn-mini" data-alvo="alterar">Solicitar alteração</span>
              <span className="tv-btn tv-btn-mini tv-perigo" data-alvo="cancelar">Cancelar</span>
            </div>
          </div>
          <div className="tv-cartao"><ItemAg dia="21" mes="nov" nome="João Pedro" info="14:00 · Ortodontia · Na sede" /></div>
        </div>
      )
    case 'perfil':
      return (
        <div className="tv-pilha">
          <div className="tv-titulo">Meu perfil</div>
          <div className="tv-cartao tv-campos">
            <label>Nome</label><div className="tv-input">Dr. Rafael Moreira</div>
            <label>WhatsApp</label><div className="tv-input">(14) 99999-0000</div>
          </div>
          <div className="tv-cartao" data-alvo="ofertas">
            <div className="tv-sub">Comunicações</div>
            <div className="tv-check-linha"><i className={estado.ofertas ? 'on' : ''}>{estado.ofertas ? '✓' : ''}</i>Quero receber novidades e ofertas</div>
          </div>
          <div className="tv-cartao"><div className="tv-sub">Alterar senha</div><div className="tv-input">••••••••</div></div>
        </div>
      )
    case 'fim':
      return (
        <div className="tv-pilha tv-centro tv-final" data-alvo="fim">
          <img src="./icon.svg" alt="" width="64" height="64" />
          <div className="tv-titulo">Tudo pronto!</div>
          <small>Compre créditos, agende em poucos toques e acompanhe tudo pelo app.</small>
        </div>
      )
    default:
      return null
  }
}

function Passos({ n }) {
  return <div className="tv-passos">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</div>
}
function ItemAg({ dia, mes, nome, info }) {
  return (
    <div className="tv-item">
      <div className="tv-data"><b>{dia}</b><small>{mes}</small></div>
      <div><b>{nome}</b><small>{info}</small></div>
    </div>
  )
}

const ICONES = [
  <path key="i" d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  <g key="a"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></g>,
  <g key="g"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M7 14h3M7 17h6" /></g>,
  <g key="c"><path d="M4 7l8-4 8 4-8 4z" /><path d="M4 12l8 4 8-4M4 17l8 4 8-4" /></g>,
  <g key="p"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></g>,
]
const ABAS = ['Início', 'Agendar', 'Agenda', 'Combos', 'Perfil']

/* ---------------- player ---------------- */
export default function TutorialVideo({ antecedencia, cancelamento, passoAtual, autoplay = true, compacto = false, grande = false, inicioEm = 0, onAmpliar }) {
  const cenas = useMemo(() => roteiro({ antecedencia, cancelamento }), [antecedencia, cancelamento])
  const inicios = useMemo(() => { let s = 0; return cenas.map((c) => { const i = s; s += c.dur; return i }) }, [cenas])
  const total = inicios[inicios.length - 1] + cenas[cenas.length - 1].dur

  const reduzir = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [t, setT] = useState(inicioEm)
  const [tocando, setTocando] = useState(autoplay && !reduzir)
  const tRef = useRef(inicioEm)
  const quadro = useRef(null)
  const raiz = useRef(null)
  const [cheia, setCheia] = useState(false)
  const palco = useRef(null)
  const [escala, setEscala] = useState(1)
  const [cursor, setCursor] = useState({ x: LARG / 2, y: ALT * 0.7, visivel: false })

  // relógio
  useEffect(() => {
    if (!tocando) return
    let ultimo = performance.now(), id
    const passo = (agora) => {
      const dt = Math.min(0.1, (agora - ultimo) / 1000) * VELOCIDADE
      ultimo = agora
      tRef.current = Math.min(total, tRef.current + dt)
      setT(tRef.current)
      if (tRef.current >= total) { setTocando(false); return }
      id = requestAnimationFrame(passo)
    }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [tocando, total])

  // pausa quando a aba do navegador fica escondida
  const pausouSozinho = useRef(false)
  const tocandoRef = useRef(tocando)
  tocandoRef.current = tocando
  useEffect(() => {
    const f = () => {
      if (document.hidden) {
        if (tocandoRef.current) { pausouSozinho.current = true; setTocando(false) }
      } else if (pausouSozinho.current) {
        pausouSozinho.current = false
        setTocando(true) // volta a tocar quando a aba aparece de novo
      }
    }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [])

  // escala do celular para caber no espaço
  useLayoutEffect(() => {
    const el = quadro.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setEscala(Math.min((r.width * 0.94) / LARG, (r.height * 0.95) / ALT))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // cena e batida atuais
  let ci = 0
  for (let i = 0; i < cenas.length; i++) if (t >= inicios[i]) ci = i
  const cena = cenas[ci]
  const tl = t - inicios[ci]
  let bi = 0
  cena.batidas.forEach((b, i) => { if (tl >= b.em) bi = i })
  const batida = cena.batidas[bi]
  const estado = batida.estado || {}
  const chaveBatida = `${ci}-${bi}`

  // cursor vai até o alvo da batida
  useLayoutEffect(() => {
    const st = palco.current
    if (!st) return
    if (batida.semCursor) { setCursor((c) => ({ ...c, visivel: false })); return }
    const alvo = st.querySelector(`[data-alvo="${batida.alvo}"]`)
    if (!alvo) return
    const rs = st.getBoundingClientRect(), ra = alvo.getBoundingClientRect()
    setCursor({ x: (ra.left - rs.left + ra.width / 2) / escala, y: (ra.top - rs.top + ra.height / 2) / escala, visivel: true })
  }, [chaveBatida, escala]) // eslint-disable-line react-hooks/exhaustive-deps

  // tela cheia de verdade (monitor inteiro)
  useEffect(() => {
    const f = () => {
      setCheia(document.fullscreenElement === raiz.current)
      if (pausouSozinho.current) { pausouSozinho.current = false; setTocando(true) }
    }
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])
  const alternarTelaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else raiz.current?.requestFullscreen?.().catch(() => {})
  }
  useEffect(() => () => { if (document.fullscreenElement === raiz.current) document.exitFullscreen?.() }, [])

  const irPara = useCallback((seg) => {
    tRef.current = Math.max(0, Math.min(total - 0.01, seg))
    setT(tRef.current)
  }, [total])
  const irCena = (i) => { irPara(inicios[i] + 0.01); setTocando(true) }
  const alternar = () => {
    if (tRef.current >= total - 0.05) irPara(0)
    setTocando((v) => !v)
  }

  const capituloDoPasso = passoAtual ? cenas.findIndex((c) => c.passo === passoAtual) : -1
  const fim = t >= total - 0.05

  return (
    <div ref={raiz} className={`tv ${compacto ? 'tv-compacto' : ''} ${grande ? 'tv-grande' : ''}`}>
      <div className="tv-cabeca">
        <span className="tv-rotulo"><span className="tv-ponto" />Tutorial em vídeo</span>
        <span className="tv-cabeca-dir">
          {onAmpliar && (
            <button type="button" className="tv-ampliar" onClick={() => { setTocando(false); onAmpliar(tRef.current) }} aria-label="Ampliar vídeo" title="Ampliar vídeo">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              Ampliar
            </button>
          )}
        </span>
      </div>

      <div className="tv-quadro" ref={quadro} onClick={alternar} role="button" aria-label={tocando ? 'Pausar tutorial' : 'Reproduzir tutorial'}>
        <div className="tv-celular" style={{ width: LARG * escala, height: ALT * escala }}>
          <div className="tv-palco" ref={palco} style={{ width: LARG, height: ALT, transform: `scale(${escala})` }}>
            <div className="tv-app-topo"><img src="./icon.svg" alt="" width="18" height="18" /><b>ORAL SCAN</b></div>
            <div className="tv-conteudo" key={cena.id}><Tela cena={cena} estado={estado} t={tl} /></div>
            <div className="tv-abas">
              {ABAS.map((a, i) => (
                <span key={a} className={cena.aba === i ? 'on' : ''} data-alvo={`aba-${i}`}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONES[i]}</svg>
                  {a}
                </span>
              ))}
            </div>
            <div className={`tv-cursor ${cursor.visivel ? '' : 'oculto'}`} style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}>
              {batida.toque && <span className="tv-toque" key={chaveBatida} />}
            </div>
          </div>
        </div>
        {!tocando && (
          <span className="tv-play" aria-hidden="true">
            {fim ? '↻' : <svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>}
          </span>
        )}
      </div>

      <div className="tv-painel">
      <div className="tv-info">
        <div className="tv-info-topo">
          <span className="tv-cap-num">Capítulo {ci + 1} de {cenas.length}</span>
            {grande && typeof document !== 'undefined' && document.fullscreenEnabled && (
              <button type="button" className="tv-ampliar" onClick={alternarTelaCheia} aria-label={cheia ? 'Sair da tela cheia' : 'Tela cheia'}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{cheia ? <path d="M9 3v6H3M15 21v-6h6M3 9l6-6M21 15l-6 6" /> : <path d="M3 9V3h6M21 15v6h-6M3 3l7 7M21 21l-7-7M15 3h6v6M9 21H3v-6" />}</svg>
                {cheia ? 'Sair da tela cheia' : 'Tela cheia'}
              </button>
            )}
        </div>
        <h3 className="tv-cap-titulo" key={cena.id}>{cena.titulo.replace(/^(\d)\.\s*/, 'Passo $1 · ')}</h3>
        <p className="tv-legenda" aria-live="polite" key={chaveBatida}>{batida.legenda}</p>
      </div>

      <div className="tv-controles">
        <button type="button" className="tv-ctl" onClick={alternar} aria-label={tocando ? 'Pausar' : 'Reproduzir'}>
          {tocando
            ? <svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>}
        </button>
        <div className="tv-barra" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); irPara(((e.clientX - r.left) / r.width) * total) }}>
          <div className="tv-barra-cheia" style={{ transform: `scaleX(${t / total})` }} />
          {inicios.slice(1).map((s, i) => <i key={i} style={{ left: `${(s / total) * 100}%` }} />)}
        </div>
        <span className="tv-tempo">{fmt(t / VELOCIDADE)} / {fmt(total / VELOCIDADE)}</span>
      </div>

      {capituloDoPasso >= 0 && ci !== capituloDoPasso && (
        <button type="button" className="tv-agora" onClick={() => irCena(capituloDoPasso)}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          <span>Ver como fazer o passo {passoAtual}: <b>{cenas[capituloDoPasso].titulo.replace(/^\d\.\s*/, '')}</b></span>
        </button>
      )}

      <ol className="tv-capitulos" aria-label="Capítulos">
        {cenas.map((c, i) => (
          <li key={c.id}>
            <button type="button" className={i === ci ? 'on' : i < ci ? 'visto' : ''} onClick={() => irCena(i)} aria-current={i === ci ? 'step' : undefined}>
              <span className="n">{i < ci ? '✓' : i + 1}</span>
              <span className="nome">{c.titulo.replace(/^\d\.\s*/, '')}</span>
              <time>{fmt(inicios[i] / VELOCIDADE)}</time>
            </button>
          </li>
        ))}
      </ol>
      </div>
    </div>
  )
}

function fmt(s) {
  const m = Math.floor(s / 60), x = Math.floor(s % 60)
  return `${m}:${String(x).padStart(2, '0')}`
}
