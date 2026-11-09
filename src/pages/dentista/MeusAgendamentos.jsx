import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Modal, Selo, useAviso, useDados, Vazio } from '../../components/ui.jsx'
import { hm, diaMes, dataLonga } from '../../lib/tempo.js'
import { MODALIDADE, STATUS_AG } from '../../lib/util.js'

export default function MeusAgendamentos() {
  const avisar = useAviso()
  const [aba, setAba] = useState('futuros')
  const [cancelando, setCancelando] = useState(null)
  const [alterando, setAlterando] = useState(null)
  const [texto, setTexto] = useState('')
  const { dados, carregando, recarregar } = useDados(async () => {
    const [ags, config] = await Promise.all([api.meusAgendamentos(), api.config()])
    return { ags, config }
  })
  if (carregando || !dados) return <Carregando />
  const agora = new Date()
  const futuros = dados.ags.filter((a) => a.status === 'agendado' && new Date(a.fim) > agora).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const anteriores = dados.ags.filter((a) => !futuros.includes(a))
  const lista = aba === 'futuros' ? futuros : anteriores
  const horasCancel = dados.config.cancelamento_horas

  async function cancelar() {
    try {
      const msg = await api.cancelar(cancelando.id, texto)
      avisar(msg); setCancelando(null); setTexto(''); recarregar()
    } catch (e) { avisar(e.message, 'erro') }
  }
  async function pedirAlteracao() {
    try {
      await api.solicitarAlteracao(alterando.id, texto)
      avisar('Pedido de alteração enviado para a clínica.'); setAlterando(null); setTexto(''); recarregar()
    } catch (e) { avisar(e.message, 'erro') }
  }

  return (
    <div className="pilha">
      <div className="linha-entre">
        <h1 style={{ margin: 0 }}>Meus agendamentos</h1>
        <Link className="btn btn-primario btn-pequeno" to="/agendar">+ Agendar</Link>
      </div>
      <div className="pilulas">
        <button className={`pilula ${aba === 'futuros' ? 'ativa' : ''}`} onClick={() => setAba('futuros')}>Próximos ({futuros.length})</button>
        <button className={`pilula ${aba === 'anteriores' ? 'ativa' : ''}`} onClick={() => setAba('anteriores')}>Anteriores ({anteriores.length})</button>
      </div>
      {lista.length === 0 ? <div className="cartao"><Vazio titulo={aba === 'futuros' ? 'Nada agendado' : 'Sem histórico ainda'} /></div> : lista.map((a) => {
        const devolve = new Date(a.inicio) - agora >= horasCancel * 3600000
        return (
          <div className="item" key={a.id}>
            <div className="item-data"><b>{diaMes(a.inicio).split(' ')[0]}</b><small>{diaMes(a.inicio).split(' ').slice(-1)}</small></div>
            <div className="item-corpo">
              <div className="linha-entre">
                <h4>{a.paciente_nome}</h4>
                <Selo cor={STATUS_AG[a.status].cor}>{STATUS_AG[a.status].rotulo}</Selo>
              </div>
              <div className="suave pequeno">{dataLonga(a.inicio)} · {hm(a.inicio)}–{hm(a.fim)}</div>
              <div className="pequeno" style={{ marginTop: 4 }}>{a.servico_nome} · {MODALIDADE[a.modalidade]}</div>
              {a.endereco && <div className="suave pequeno">📍 {a.endereco}</div>}
              {a.dentes_regiao && <div className="suave pequeno">Dentes/região: {a.dentes_regiao}</div>}
              {a.alteracao_solicitada && <div className="alerta alerta-info pequeno mt" style={{ marginTop: 8 }}>Alteração solicitada: {a.alteracao_solicitada}</div>}
              {a.status === 'agendado' && new Date(a.inicio) > agora && (
                <div className="item-acoes">
                  <button className="btn btn-pequeno" onClick={() => { setTexto(''); setAlterando(a) }}>Solicitar alteração</button>
                  <button className="btn btn-pequeno btn-perigo" onClick={() => { setTexto(''); setCancelando({ ...a, devolve }) }}>Cancelar</button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      <Modal titulo="Cancelar agendamento" aberto={!!cancelando} fechar={() => setCancelando(null)}>
        {cancelando && (
          <div className="pilha">
            <p>Cancelar o escaneamento de <strong>{cancelando.paciente_nome}</strong> em {dataLonga(cancelando.inicio)} às {hm(cancelando.inicio)}?</p>
            <div className={`alerta ${cancelando.devolve ? 'alerta-ok' : 'alerta-aviso'}`}>
              {cancelando.devolve
                ? 'Como faltam mais de ' + horasCancel + ' h, o crédito volta para o seu saldo.'
                : 'Faltam menos de ' + horasCancel + ' h: pela regra de cancelamento o crédito NÃO será devolvido.'}
            </div>
            <Campo rotulo="Motivo (opcional)"><input value={texto} onChange={(e) => setTexto(e.target.value)} /></Campo>
            <div className="linha" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setCancelando(null)}>Voltar</button>
              <button className="btn btn-perigo" onClick={cancelar}>Confirmar cancelamento</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal titulo="Solicitar alteração" aberto={!!alterando} fechar={() => setAlterando(null)}>
        <div className="pilha">
          <p className="suave">Descreva a mudança desejada (novo dia/horário, local etc.). A clínica analisa e ajusta o agendamento.</p>
          <Campo rotulo="Pedido"><textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: Prefiro quinta-feira à tarde" /></Campo>
          <div className="linha" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setAlterando(null)}>Voltar</button>
            <button className="btn btn-primario" disabled={!texto.trim()} onClick={pedirAlteracao}>Enviar pedido</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
