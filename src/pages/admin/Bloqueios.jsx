import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Modal, useAviso, useDados, Vazio } from '../../components/ui.jsx'
import { hoje, somaDias, dataHora, dataHoraCurta, dataCurta, hm, ymd } from '../../lib/tempo.js'

const MOTIVOS = ['Férias', 'Curso', 'Compromisso pessoal', 'Manutenção do scanner', 'Feriado']

export default function Bloqueios() {
  const avisar = useAviso()
  const [tipo, setTipo] = useState('horario')
  const [f, setF] = useState({ dia: hoje(), ini: '08:00', fim: '12:00', diaFim: somaDias(hoje(), 1), motivo: '' })
  const [conflitos, setConflitos] = useState(null)
  const [verPassados, setVerPassados] = useState(false)
  const { dados, carregando, recarregar } = useDados(() => api.bloqueios())
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  function intervalo() {
    if (tipo === 'horario') return { inicio: dataHora(f.dia, f.ini), fim: dataHora(f.dia, f.fim) }
    if (tipo === 'dia') return { inicio: dataHora(f.dia, '00:00'), fim: dataHora(somaDias(f.dia, 1), '00:00') }
    return { inicio: dataHora(f.dia, '00:00'), fim: dataHora(somaDias(f.diaFim, 1), '00:00') }
  }

  async function verificar(e) {
    e.preventDefault()
    const { inicio, fim } = intervalo()
    if (fim <= inicio) return avisar('O fim precisa ser depois do início.', 'erro')
    const ags = await api.agendamentos({ de: dataHora(somaDias(ymd(inicio), -1), '00:00'), ate: dataHora(somaDias(ymd(fim), 1), '00:00') })
    const afetados = ags.filter((a) => a.status === 'agendado' && new Date(a.inicio) < fim && inicio < new Date(a.fim))
    if (afetados.length) setConflitos({ afetados, inicio, fim })
    else salvar(inicio, fim)
  }

  async function salvar(inicio, fim) {
    try {
      await api.salvarBloqueio({ inicio: inicio.toISOString(), fim: fim.toISOString(), motivo: f.motivo })
      avisar('Agenda bloqueada.'); setConflitos(null); recarregar()
    } catch (er) { avisar(er.message, 'erro') }
  }

  async function liberar(b) {
    if (!confirm(`Liberar o bloqueio de ${dataHoraCurta(b.inicio)} a ${dataHoraCurta(b.fim)}?`)) return
    try { await api.excluirBloqueio(b.id); avisar('Horários liberados.'); recarregar() } catch (er) { avisar(er.message, 'erro') }
  }

  const agora = new Date()
  const lista = (dados || []).filter((b) => verPassados || new Date(b.fim) > agora)
  const descreve = (b) => {
    const i = new Date(b.inicio), fm = new Date(b.fim)
    if (hm(i) === '00:00' && hm(fm) === '00:00') {
      const ultimo = somaDias(ymd(fm), -1)
      return ymd(i) === ultimo ? `${dataCurta(i)} (dia inteiro)` : `${dataCurta(i)} a ${dataCurta(dataHora(ultimo, '12:00'))}`
    }
    return ymd(i) === ymd(fm) ? `${dataCurta(i)} · ${hm(i)}–${hm(fm)}` : `${dataHoraCurta(i)} a ${dataHoraCurta(fm)}`
  }

  return (
    <div className="pilha">
      <div className="cabecalho"><div><h1>Bloqueios de agenda</h1><p>Horários bloqueados nunca aparecem como disponíveis para os dentistas.</p></div></div>
      <form className="cartao pilha" onSubmit={verificar}>
        <div className="pilulas">
          {[['horario', 'Horário específico / período'], ['dia', 'Dia inteiro'], ['dias', 'Vários dias']].map(([v, r]) => (
            <button type="button" key={v} className={`pilula ${tipo === v ? 'ativa' : ''}`} onClick={() => setTipo(v)}>{r}</button>
          ))}
        </div>
        <div className="form">
          <Campo rotulo={tipo === 'dias' ? 'Primeiro dia' : 'Dia'}><input type="date" required value={f.dia} onChange={set('dia')} /></Campo>
          {tipo === 'horario' && <>
            <Campo rotulo="Das"><input type="time" required value={f.ini} onChange={set('ini')} /></Campo>
            <Campo rotulo="Até"><input type="time" required value={f.fim} onChange={set('fim')} /></Campo>
          </>}
          {tipo === 'dias' && <Campo rotulo="Último dia"><input type="date" required value={f.diaFim} min={f.dia} onChange={set('diaFim')} /></Campo>}
          <Campo rotulo="Motivo" largo>
            <input list="motivos" value={f.motivo} onChange={set('motivo')} placeholder="Férias, curso, manutenção do scanner…" />
            <datalist id="motivos">{MOTIVOS.map((m) => <option key={m} value={m} />)}</datalist>
          </Campo>
        </div>
        <div><button className="btn btn-primario">Bloquear</button></div>
      </form>

      <div className="cartao">
        <div className="cartao-titulo">
          <h2>Bloqueios {verPassados ? '' : 'ativos'}</h2>
          <label className="check pequeno"><input type="checkbox" checked={verPassados} onChange={(e) => setVerPassados(e.target.checked)} /> Mostrar passados</label>
        </div>
        {carregando ? <Carregando /> : lista.length === 0 ? <Vazio titulo="Nenhum bloqueio" /> : (
          <div className="tabela-caixa">
            <table>
              <thead><tr><th>Período</th><th>Motivo</th><th></th></tr></thead>
              <tbody>
                {lista.map((b) => (
                  <tr key={b.id}>
                    <td>{descreve(b)}</td>
                    <td>{b.motivo || '—'}</td>
                    <td className="num">{new Date(b.fim) > agora && <button className="btn btn-pequeno" onClick={() => liberar(b)}>Liberar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal titulo="Atenção: há agendamentos neste período" aberto={!!conflitos} fechar={() => setConflitos(null)}>
        {conflitos && (
          <div className="pilha">
            <div className="alerta alerta-aviso">O bloqueio afeta {conflitos.afetados.length} agendamento(s). Eles NÃO serão cancelados automaticamente — remarque ou cancele cada um e avise o dentista.</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {conflitos.afetados.map((a) => <li key={a.id}>{dataHoraCurta(a.inicio)} · {a.paciente_nome} ({a.dentista?.nome})</li>)}
            </ul>
            <div className="linha" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConflitos(null)}>Voltar</button>
              <button className="btn btn-primario" onClick={() => salvar(conflitos.inicio, conflitos.fim)}>Bloquear mesmo assim</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
