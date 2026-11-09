import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Modal, useAviso, useDados } from '../../components/ui.jsx'
import { DetalheAgendamento } from '../../components/admin.jsx'
import { hoje, somaDias, dataHora, hm, ymd, diaSemana, DIAS_CURTOS, nomeMes, dataLonga, addMin } from '../../lib/tempo.js'
import { horariosLivres } from '../../lib/agenda.js'
import { MODALIDADE } from '../../lib/util.js'

const inicioSemana = (d) => somaDias(d, -diaSemana(d))

export default function AgendaAdmin() {
  const [visao, setVisao] = useState('semana')
  const [ref, setRef] = useState(hoje())
  const [aberto, setAberto] = useState(null)
  const [novo, setNovo] = useState(false)

  const periodo = useMemo(() => {
    if (visao === 'dia') return { de: ref, ate: somaDias(ref, 1) }
    if (visao === 'semana') { const s = inicioSemana(ref); return { de: s, ate: somaDias(s, 7) } }
    const p = `${ref.slice(0, 7)}-01`
    const g = inicioSemana(p)
    return { de: g, ate: somaDias(g, 42), mesRef: p }
  }, [visao, ref])

  const { dados, carregando, recarregar } = useDados(async () => {
    const de = dataHora(periodo.de, '00:00'), ate = dataHora(periodo.ate, '00:00')
    const [ags, bloqueios, config, servicos, ocup] = await Promise.all([
      api.agendamentos({ de, ate }), api.bloqueios(), api.config(), api.servicos(), api.ocupacao(addMin(de, -180), addMin(ate, 180)),
    ])
    return { ags: ags.filter((a) => a.status !== 'cancelado'), bloqueios, config, servicos, ocup }
  }, [periodo.de, periodo.ate])

  const mover = (n) => {
    if (visao === 'dia') setRef(somaDias(ref, n))
    else if (visao === 'semana') setRef(somaDias(ref, 7 * n))
    else { const [y, m] = ref.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 15)); setRef(d.toISOString().slice(0, 10)) }
  }
  const titulo = visao === 'mes' ? nomeMes(ref) : visao === 'dia' ? dataLonga(dataHora(ref, '12:00'))
    : `${dataHora(periodo.de, '12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${dataHora(somaDias(periodo.ate, -1), '12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`

  const doDia = (d) => {
    if (!dados) return { ags: [], bloqs: [] }
    const ini = dataHora(d, '00:00'), fim = dataHora(somaDias(d, 1), '00:00')
    return {
      ags: dados.ags.filter((a) => ymd(a.inicio) === d),
      bloqs: dados.bloqueios.filter((b) => new Date(b.inicio) < fim && ini < new Date(b.fim)),
    }
  }

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><h1>Agenda</h1><p>Clique em um atendimento para ver detalhes, concluir, remarcar ou avisar o dentista.</p></div>
        <div className="linha">
          <Link className="btn" to="/admin/bloqueios">Bloquear horários</Link>
          <button className="btn btn-primario" onClick={() => setNovo(true)}>+ Agendamento manual</button>
        </div>
      </div>
      <div className="linha-entre">
        <div className="pilulas">
          {[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([v, r]) => (
            <button key={v} className={`pilula ${visao === v ? 'ativa' : ''}`} onClick={() => setVisao(v)}>{r}</button>
          ))}
        </div>
        <div className="linha">
          <button className="btn btn-pequeno" onClick={() => mover(-1)} aria-label="Anterior">‹</button>
          <button className="btn btn-pequeno" onClick={() => setRef(hoje())}>Hoje</button>
          <button className="btn btn-pequeno" onClick={() => mover(1)} aria-label="Próximo">›</button>
          <strong style={visao === 'semana' ? null : { textTransform: 'capitalize' }}>{titulo}</strong>
        </div>
      </div>

      {carregando || !dados ? <Carregando /> : visao === 'mes' ? (
        <div className="mes">
          {DIAS_CURTOS.map((d) => <div key={d} className="mes-cab">{d}</div>)}
          {Array.from({ length: 42 }, (_, i) => somaDias(periodo.de, i)).map((d) => {
            const { ags, bloqs } = doDia(d)
            const fechado = (dados.config.horarios[diaSemana(d)] || []).length === 0
            return (
              <div key={d} className={`mes-dia ${d.slice(0, 7) !== ref.slice(0, 7) ? 'fora' : ''} ${d === hoje() ? 'hoje' : ''} ${fechado ? 'fechado' : ''}`}
                onClick={() => { setRef(d); setVisao('dia') }}>
                <span className="mes-num">{Number(d.slice(8))}</span>
                {bloqs.length > 0 && <span className="ev ev-bloqueio">Bloqueado</span>}
                {ags.slice(0, 3).map((a) => <span key={a.id} className={`ev ev-${a.status} ${a.modalidade === 'externo' ? 'ev-externo' : ''}`}>{hm(a.inicio)} {a.paciente_nome}</span>)}
                {ags.length > 3 && <span className="suave">+{ags.length - 3}</span>}
              </div>
            )
          })}
        </div>
      ) : visao === 'semana' ? (
        <div className="semana">
          {Array.from({ length: 7 }, (_, i) => somaDias(periodo.de, i)).map((d) => {
            const { ags, bloqs } = doDia(d)
            return (
              <div key={d} className="semana-col" style={d === hoje() ? { borderColor: 'var(--primaria)' } : null}>
                <h4><button className="btn-link" style={{ padding: 0 }} onClick={() => { setRef(d); setVisao('dia') }}>{DIAS_CURTOS[diaSemana(d)]} {d.slice(8)}/{d.slice(5, 7)}</button></h4>
                {bloqs.map((b) => <span key={b.id} className="ev ev-bloqueio">🔒 {hm(b.inicio)}–{hm(b.fim)} {b.motivo}</span>)}
                {ags.map((a) => (
                  <span key={a.id} className={`ev ev-${a.status} ${a.modalidade === 'externo' ? 'ev-externo' : ''}`} onClick={() => setAberto(a)}>
                    <strong>{hm(a.inicio)}</strong> {a.paciente_nome}<br /><small>{a.servico_nome} · {a.dentista?.nome}</small>
                  </span>
                ))}
                {ags.length === 0 && bloqs.length === 0 && <span className="suave pequeno">—</span>}
              </div>
            )
          })}
        </div>
      ) : (
        <VisaoDia dia={ref} dados={dados} doDia={doDia} abrir={setAberto} />
      )}
      <div className="linha pequeno suave">
        <span className="ev ev-agendado">Agendado</span><span className="ev ev-concluido">Concluído</span>
        <span className="ev ev-falta">Falta</span><span className="ev ev-bloqueio">Bloqueio</span>
        <span className="ev ev-agendado ev-externo">Externo</span>
      </div>
      <DetalheAgendamento ag={aberto} config={dados?.config} fechar={() => setAberto(null)} aoMudar={recarregar} />
      {novo && <NovoAgendamento fechar={() => setNovo(false)} aoSalvar={recarregar} />}
    </div>
  )
}

function VisaoDia({ dia, dados, doDia, abrir }) {
  const { ags, bloqs } = doDia(dia)
  const curto = [...dados.servicos].filter((s) => s.ativo).sort((a, b) => a.duracao_min - b.duracao_min)[0]
  const livres = horariosLivres({ dia, servico: curto, modalidade: 'sede', config: dados.config, ocupacao: dados.ocup, ignorarAntecedencia: true })
  const itens = [
    ...ags.map((a) => ({ t: new Date(a.inicio), tipo: 'ag', a })),
    ...bloqs.map((b) => ({ t: new Date(b.inicio), tipo: 'bl', b })),
  ].sort((x, y) => x.t - y.t)
  const janelas = dados.config.horarios[diaSemana(dia)] || []
  return (
    <div className="grade-2">
      <div className="cartao">
        <div className="cartao-titulo"><h3>Atendimentos e bloqueios</h3><span className="suave pequeno">{janelas.length ? janelas.map((j) => `${j.ini}–${j.fim}`).join(' · ') : 'Fechado'}</span></div>
        {itens.length === 0 ? <p className="suave">Nada marcado neste dia.</p> : (
          <div className="timeline">
            {itens.map((it) => it.tipo === 'bl' ? (
              <div key={it.b.id} className="ev ev-bloqueio" style={{ padding: 10 }}>🔒 {hm(it.b.inicio)}–{hm(it.b.fim)} · {it.b.motivo || 'Bloqueio'}</div>
            ) : (
              <button key={it.a.id} className="item" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => abrir(it.a)}>
                <div className="item-data"><b style={{ fontSize: '1rem' }}>{hm(it.a.inicio)}</b><small>{hm(it.a.fim)}</small></div>
                <div className="item-corpo">
                  <h4>{it.a.paciente_nome} <span className={`ev ev-${it.a.status}`}>{it.a.status}</span></h4>
                  <div className="suave pequeno">{it.a.servico_nome} · {it.a.dentista?.nome}</div>
                  <div className="pequeno">{MODALIDADE[it.a.modalidade]}{it.a.modalidade === 'externo' ? ` – ${it.a.endereco}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="cartao">
        <div className="cartao-titulo"><h3>Horários livres</h3><span className="suave pequeno">{curto ? `encaixes de ${curto.duracao_min} min na sede` : ''}</span></div>
        {livres.length === 0 ? <p className="suave">Sem horários livres.</p> : (
          <div className="horas">{livres.map((h) => <div key={h.inicio.toISOString()} className="slot-livre centro">{hm(h.inicio)}</div>)}</div>
        )}
      </div>
    </div>
  )
}

function NovoAgendamento({ fechar, aoSalvar }) {
  const avisar = useAviso()
  const { dados } = useDados(async () => {
    const [dentistas, servicos, regioes] = await Promise.all([api.dentistas(), api.servicos(), api.regioes()])
    return { dentistas: dentistas.filter((d) => d.papel === 'dentista' && d.ativo), servicos: servicos.filter((s) => s.ativo), regioes: regioes.filter((r) => r.ativo) }
  })
  const [f, setF] = useState({ dentista_id: '', servico_id: '', modalidade: 'sede', regiao_id: '', endereco: '', dia: somaDias(hoje(), 1), hora: '09:00', paciente_nome: '', paciente_telefone: '', dentes_regiao: '', observacoes: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function salvar(e) {
    e.preventDefault()
    try {
      await api.agendar({ ...f, inicio: dataHora(f.dia, f.hora) })
      avisar('Agendamento criado (1 crédito do dentista foi usado).'); aoSalvar(); fechar()
    } catch (er) { avisar(er.message, 'erro') }
  }
  return (
    <Modal titulo="Agendamento manual" aberto fechar={fechar} largura={640}>
      {!dados ? <Carregando /> : (
        <form className="pilha" onSubmit={salvar}>
          <p className="suave pequeno">Use para agendar em nome de um dentista (ex.: pedido por WhatsApp). A antecedência mínima não se aplica, mas o dentista precisa ter crédito válido.</p>
          <div className="form">
            <Campo rotulo="Dentista *" largo>
              <select required value={f.dentista_id} onChange={(e) => {
                const d = dados.dentistas.find((x) => x.id === e.target.value)
                setF({ ...f, dentista_id: e.target.value, endereco: d ? [d.endereco, d.bairro, d.cidade].filter(Boolean).join(' – ') : '' })
              }}>
                <option value="">Selecione…</option>
                {dados.dentistas.map((d) => <option key={d.id} value={d.id}>{d.nome} {d.clinica ? `– ${d.clinica}` : ''}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Serviço *">
              <select required value={f.servico_id} onChange={set('servico_id')}>
                <option value="">Selecione…</option>
                {dados.servicos.map((s) => <option key={s.id} value={s.id}>{s.nome} ({s.duracao_min} min)</option>)}
              </select>
            </Campo>
            <Campo rotulo="Local">
              <select value={f.modalidade} onChange={set('modalidade')}>
                <option value="sede">Na sede</option><option value="externo">Na clínica do dentista</option>
              </select>
            </Campo>
            {f.modalidade === 'externo' && <>
              <Campo rotulo="Região *">
                <select required value={f.regiao_id} onChange={set('regiao_id')}>
                  <option value="">Selecione…</option>
                  {dados.regioes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Endereço *" largo><input required value={f.endereco} onChange={set('endereco')} /></Campo>
            </>}
            <Campo rotulo="Dia *"><input type="date" required value={f.dia} onChange={set('dia')} /></Campo>
            <Campo rotulo="Horário *"><input type="time" required value={f.hora} onChange={set('hora')} /></Campo>
            <Campo rotulo="Paciente *" largo><input required value={f.paciente_nome} onChange={set('paciente_nome')} /></Campo>
            <Campo rotulo="Telefone do paciente"><input value={f.paciente_telefone} onChange={set('paciente_telefone')} /></Campo>
            <Campo rotulo="Dentes/região"><input value={f.dentes_regiao} onChange={set('dentes_regiao')} /></Campo>
            <Campo rotulo="Observações" largo><textarea value={f.observacoes} onChange={set('observacoes')} /></Campo>
          </div>
          <div className="linha" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={fechar}>Cancelar</button>
            <button className="btn btn-primario">Agendar</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
