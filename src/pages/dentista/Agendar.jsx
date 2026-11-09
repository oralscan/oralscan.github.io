import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useSessao } from '../../App.jsx'
import { Campo, Carregando, Modal, useAviso, useDados, Vazio } from '../../components/ui.jsx'
import TutorialVideo from '../../components/Tutorial.jsx'
import { horariosLivres } from '../../lib/agenda.js'
import { hoje, somaDias, dataHora, diaSemana, DIAS_CURTOS, hm, dataLonga, addMin } from '../../lib/tempo.js'
import { resumoCreditos, MODALIDADE, linkWhats, plural } from '../../lib/util.js'

const DIAS_A_FRENTE = 45

export default function Agendar() {
  const { perfil } = useSessao()
  const avisar = useAviso()
  const nav = useNavigate()
  const { dados, carregando } = useDados(async () => {
    const [config, servicos, regioes, creds] = await Promise.all([api.config(), api.servicos(), api.regioes(), api.meusCreditos()])
    return { config, servicos: servicos.filter((s) => s.ativo), regioes: regioes.filter((r) => r.ativo), creds }
  })
  const [passo, setPasso] = useState(1)
  const [f, setF] = useState({
    servico_id: '', modalidade: '', regiao_id: '', endereco: '', dia: '', inicio: null,
    paciente_nome: '', paciente_telefone: '', dentes_regiao: '', observacoes: '',
  })
  const [ocupacao, setOcupacao] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [feito, setFeito] = useState(null)

  useEffect(() => {
    if (perfil && !f.endereco) {
      setF((x) => ({ ...x, endereco: [perfil.endereco, perfil.bairro, perfil.cidade].filter(Boolean).join(' – ') }))
    }
  }, [perfil]) // eslint-disable-line react-hooks/exhaustive-deps

  const carregarOcupacao = () => {
    const de = dataHora(hoje(), '00:00')
    const ate = dataHora(somaDias(hoje(), DIAS_A_FRENTE + 1), '00:00')
    return api.ocupacao(addMin(de, -180), addMin(ate, 180)).then(setOcupacao)
  }
  useEffect(() => { if (passo === 3) carregarOcupacao() }, [passo]) // eslint-disable-line react-hooks/exhaustive-deps

  const servico = dados?.servicos.find((s) => s.id === f.servico_id)
  const regiao = dados?.regioes.find((r) => r.id === f.regiao_id)

  const dias = useMemo(() => {
    if (!dados || !servico || !ocupacao) return []
    const lista = []
    for (let i = 0; i <= DIAS_A_FRENTE; i++) {
      const dia = somaDias(hoje(), i)
      const livres = horariosLivres({ dia, servico, modalidade: f.modalidade, regiao, config: dados.config, ocupacao })
      lista.push({ dia, livres })
    }
    return lista
  }, [dados, servico, regiao, f.modalidade, ocupacao])

  if (carregando || !dados) return <Carregando />

  const hj = hoje()
  const creditosValidos = dados.creds.filter((c) => c.status === 'disponivel' && c.validade >= hj)
  const r = resumoCreditos(dados.creds, hj)
  const temCredito = (mod) => creditosValidos.some((c) => c.modalidade === 'ambos' || c.modalidade === mod)

  if (feito) return <Sucesso ag={feito} config={dados.config} perfil={perfil} />

  const tutorial = { antecedencia: dados.config.antecedencia_horas, cancelamento: dados.config.cancelamento_horas }

  if (r.disponiveis === 0) {
    return (
      <ComTutorial {...tutorial}>
      <div className="cartao">
        <Vazio titulo="Você ainda não tem créditos disponíveis">
          <p>Para agendar, adquira um combo de escaneamentos. O crédito é liberado assim que o PIX é confirmado.</p>
          <Link className="btn btn-primario" to="/combos">Ver combos</Link>
        </Vazio>
      </div>
      </ComTutorial>
    )
  }

  const diaSel = dias.find((d) => d.dia === f.dia)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function confirmar() {
    setEnviando(true)
    try {
      const ag = await api.agendar({ ...f, inicio: f.inicio })
      setFeito(ag)
      avisar('Agendamento confirmado!')
    } catch (e) {
      avisar(e.message, 'erro')
      if (/reservado|bloqueado|antecedência/.test(e.message)) { setF({ ...f, inicio: null }); setPasso(3); carregarOcupacao() }
    } finally { setEnviando(false) }
  }

  return (
    <ComTutorial {...tutorial} passoAtual={passo}>
    <div className="pilha">
      <div className="linha-entre">
        <h1 style={{ margin: 0 }}>Agendar escaneamento</h1>
        <span className="suave pequeno">{plural(r.disponiveis, 'crédito disponível', 'créditos disponíveis')}</span>
      </div>
      <div className="passos">{[1, 2, 3, 4, 5].map((n) => <div key={n} className={`passo ${n <= passo ? 'feito' : ''}`} />)}</div>

      {passo === 1 && (
        <div className="cartao">
          <h2>1. Tipo de escaneamento</h2>
          <div className="opcoes">
            {dados.servicos.map((s) => (
              <button key={s.id} className={`opcao ${f.servico_id === s.id ? 'marcada' : ''}`}
                onClick={() => { setF({ ...f, servico_id: s.id, dia: '', inicio: null }); setPasso(2) }}>
                <strong>{s.nome}</strong>
                <span>{s.descricao}</span>
                <span>⏱ {s.duracao_min} min</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {passo === 2 && (
        <div className="cartao">
          <h2>2. Local do atendimento</h2>
          <div className="opcoes">
            <button className={`opcao ${f.modalidade === 'sede' ? 'marcada' : ''}`} disabled={!temCredito('sede')}
              onClick={() => setF({ ...f, modalidade: 'sede', dia: '', inicio: null })}>
              <strong>Na sede</strong>
              <span>Você leva o paciente até o scanner.</span>
              {dados.config.endereco_sede && <span>📍 {dados.config.endereco_sede}</span>}
              {!temCredito('sede') && <span>Seus créditos não valem para esta modalidade.</span>}
            </button>
            <button className={`opcao ${f.modalidade === 'externo' ? 'marcada' : ''}`} disabled={!temCredito('externo') || dados.regioes.length === 0}
              onClick={() => setF({ ...f, modalidade: 'externo', dia: '', inicio: null })}>
              <strong>Na minha clínica</strong>
              <span>A profissional vai até você com o scanner.</span>
              {!temCredito('externo') && <span>Seus créditos não valem para atendimento externo.</span>}
              {dados.regioes.length === 0 && <span>Atendimento externo indisponível no momento.</span>}
            </button>
          </div>
          {f.modalidade === 'externo' && (
            <div className="form mt">
              <Campo rotulo="Região do atendimento *" dica="Só aparecem as regiões atendidas.">
                <select value={f.regiao_id} onChange={(e) => setF({ ...f, regiao_id: e.target.value, dia: '', inicio: null })}>
                  <option value="">Selecione…</option>
                  {dados.regioes.map((rg) => <option key={rg.id} value={rg.id}>{rg.nome}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Endereço onde será feito o escaneamento *" largo>
                <input value={f.endereco} onChange={set('endereco')} placeholder="Rua, número, sala, bairro" />
              </Campo>
            </div>
          )}
          <div className="linha-entre mt">
            <button className="btn" onClick={() => setPasso(1)}>Voltar</button>
            <button className="btn btn-primario" disabled={!f.modalidade || (f.modalidade === 'externo' && (!f.regiao_id || !f.endereco.trim()))}
              onClick={() => setPasso(3)}>Continuar</button>
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="cartao">
          <h2>3. Dia e horário</h2>
          <p className="suave pequeno">Mostramos só horários realmente livres, com no mínimo {dados.config.antecedencia_horas} h de antecedência{f.modalidade === 'externo' ? ' e já considerando o deslocamento' : ''}.</p>
          {!ocupacao ? <Carregando texto="Buscando horários…" /> : (
            <>
              <div className="dias">
                {dias.map(({ dia, livres }) => {
                  const d = new Date(`${dia}T12:00:00-03:00`)
                  return (
                    <button key={dia} className={`dia ${f.dia === dia ? 'marcado' : ''}`} disabled={livres.length === 0}
                      onClick={() => setF({ ...f, dia, inicio: null })}>
                      <small>{DIAS_CURTOS[diaSemana(dia)]}</small>
                      <b>{dia.slice(8)}</b>
                      <small>{d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}</small>
                      {livres.length > 0 && <em>{livres.length} livres</em>}
                    </button>
                  )
                })}
              </div>
              {dias.every((d) => d.livres.length === 0) && <Vazio titulo="Sem horários livres nos próximos dias">Fale com a clínica pelo WhatsApp.</Vazio>}
              {diaSel && (
                <>
                  <h3 className="mt">{dataLonga(dataHora(diaSel.dia, '12:00'))}</h3>
                  <div className="horas">
                    {diaSel.livres.map((h) => (
                      <button key={h.inicio.toISOString()} className={`hora ${f.inicio?.getTime() === h.inicio.getTime() ? 'marcada' : ''}`}
                        onClick={() => setF({ ...f, inicio: h.inicio })}>{hm(h.inicio)}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          <div className="linha-entre mt">
            <button className="btn" onClick={() => setPasso(2)}>Voltar</button>
            <button className="btn btn-primario" disabled={!f.inicio} onClick={() => setPasso(4)}>Continuar</button>
          </div>
        </div>
      )}

      {passo === 4 && (
        <div className="cartao">
          <h2>4. Dados do paciente</h2>
          <div className="form">
            <Campo rotulo="Nome do paciente *" largo><input value={f.paciente_nome} onChange={set('paciente_nome')} autoFocus /></Campo>
            <Campo rotulo="Telefone do paciente" dica="Opcional"><input type="tel" value={f.paciente_telefone} onChange={set('paciente_telefone')} /></Campo>
            <Campo rotulo="Região ou dentes envolvidos"><input value={f.dentes_regiao} onChange={set('dentes_regiao')} placeholder="Ex.: 36, 37 · arcada superior" /></Campo>
            <Campo rotulo="Observações sobre o escaneamento" largo>
              <textarea value={f.observacoes} onChange={set('observacoes')} placeholder="Informações adicionais sobre o caso" />
            </Campo>
          </div>
          <div className="linha-entre mt">
            <button className="btn" onClick={() => setPasso(3)}>Voltar</button>
            <button className="btn btn-primario" disabled={!f.paciente_nome.trim()} onClick={() => setPasso(5)}>Revisar</button>
          </div>
        </div>
      )}

      {passo === 5 && (
        <div className="cartao">
          <h2>5. Confirme o agendamento</h2>
          <dl className="resumo">
            <dt>Escaneamento</dt><dd>{servico?.nome} ({servico?.duracao_min} min)</dd>
            <dt>Data</dt><dd>{dataLonga(f.inicio)}</dd>
            <dt>Horário</dt><dd>{hm(f.inicio)}</dd>
            <dt>Local</dt><dd>{f.modalidade === 'externo' ? `${f.endereco} (${regiao?.nome})` : `Sede${dados.config.endereco_sede ? ' – ' + dados.config.endereco_sede : ''}`}</dd>
            <dt>Paciente</dt><dd>{f.paciente_nome}</dd>
            {f.dentes_regiao && <><dt>Região/dentes</dt><dd>{f.dentes_regiao}</dd></>}
            {f.observacoes && <><dt>Observações</dt><dd>{f.observacoes}</dd></>}
            <dt>Crédito</dt><dd>1 crédito será descontado ({r.disponiveis} → {r.disponiveis - 1})</dd>
          </dl>
          <p className="suave pequeno mt">Cancelamentos com mais de {dados.config.cancelamento_horas} h de antecedência devolvem o crédito.</p>
          <div className="linha-entre mt">
            <button className="btn" onClick={() => setPasso(4)}>Voltar</button>
            <button className="btn btn-primario" disabled={enviando} onClick={confirmar}>{enviando ? 'Confirmando…' : 'Confirmar agendamento'}</button>
          </div>
        </div>
      )}
      <button className="btn-link" onClick={() => nav('/')}>Cancelar</button>
    </div>
    </ComTutorial>
  )
}

// vídeo tutorial à esquerda (computador) ou em janela (celular)
function ComTutorial({ children, passoAtual, antecedencia, cancelamento }) {
  const [aberto, setAberto] = useState(false)
  const [ampliado, setAmpliado] = useState(null) // segundo do vídeo ao ampliar
  const larga = typeof window !== 'undefined' && window.matchMedia('(min-width: 980px)').matches
  return (
    <div className="agendar-grade">
      <aside className="agendar-video" aria-label="Tutorial em vídeo">
        {larga && <TutorialVideo antecedencia={antecedencia} cancelamento={cancelamento} passoAtual={passoAtual} onAmpliar={setAmpliado} />}
      </aside>
      <div className="pilha">
        <button type="button" className="agendar-video-btn" onClick={() => setAberto(true)}>
          <span className="ic"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
          <span><b>Ver tutorial em vídeo</b><small>Como comprar créditos, agendar e acompanhar · cerca de 1 minuto</small></span>
        </button>
        {children}
      </div>
      <Modal titulo="Como usar o Oral Scan" aberto={aberto} fechar={() => setAberto(false)} largura={440}>
        {aberto && <TutorialVideo antecedencia={antecedencia} cancelamento={cancelamento} passoAtual={passoAtual} compacto />}
      </Modal>
      <Modal titulo="Como usar o Oral Scan" aberto={ampliado !== null} fechar={() => setAmpliado(null)} largura={1040}>
        {ampliado !== null && <TutorialVideo antecedencia={antecedencia} cancelamento={cancelamento} passoAtual={passoAtual} grande inicioEm={ampliado} />}
      </Modal>
    </div>
  )
}

function Sucesso({ ag, config, perfil }) {
  const texto = `Olá! Confirmo o escaneamento intraoral agendado pelo app Oral Scan:\n\n` +
    `📅 ${dataLonga(ag.inicio)} às ${hm(ag.inicio)}\n🦷 ${ag.servico_nome}\n👤 Paciente: ${ag.paciente_nome}\n` +
    `📍 ${ag.modalidade === 'externo' ? 'Na minha clínica: ' + ag.endereco : 'Na sede' + (config.endereco_sede ? ': ' + config.endereco_sede : '')}\n\n` +
    `Dentista: ${perfil?.nome}${perfil?.clinica ? ' – ' + perfil.clinica : ''}`
  return (
    <div className="cartao centro pilha" style={{ alignItems: 'center' }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <h1>Agendamento confirmado!</h1>
      <p className="suave">{dataLonga(ag.inicio)} às <strong>{hm(ag.inicio)}</strong> · {ag.servico_nome}<br />Paciente: {ag.paciente_nome}</p>
      {config.whatsapp_clinica && (
        <a className="btn btn-whats" href={linkWhats(config.whatsapp_clinica, texto)} target="_blank" rel="noopener">Enviar confirmação no WhatsApp</a>
      )}
      <div className="linha" style={{ justifyContent: 'center' }}>
        <Link className="btn" to="/agendamentos">Meus agendamentos</Link>
        <Link className="btn btn-primario" to="/">Início</Link>
      </div>
    </div>
  )
}
