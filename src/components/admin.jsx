import { useState } from 'react'
import { api } from '../lib/api.js'
import { Campo, Modal, Selo, useAviso } from './ui.jsx'
import { dataLonga, hm, ymd, dataHora, dataHoraCurta } from '../lib/tempo.js'
import { linkWhats, MODALIDADE, STATUS_AG } from '../lib/util.js'

export function mensagensWhats(a, config) {
  const quando = `${dataLonga(a.inicio)} às ${hm(a.inicio)}`
  const local = a.modalidade === 'externo' ? `na sua clínica (${a.endereco})` : `na sede${config?.endereco_sede ? ' – ' + config.endereco_sede : ''}`
  const nome = a.dentista?.nome || ''
  return {
    confirmacao: `Olá, ${nome}! ✅ Escaneamento confirmado.\n📅 ${quando}\n🦷 ${a.servico_nome}\n👤 Paciente: ${a.paciente_nome}\n📍 ${local}\n\nOral Scan – Dra. Tamires Bueno`,
    lembrete: `Olá, ${nome}! ⏰ Lembrete do escaneamento de ${a.paciente_nome}: ${quando}, ${local}. Qualquer imprevisto, avise por aqui. Oral Scan`,
    cancelamento: `Olá, ${nome}. O escaneamento de ${a.paciente_nome} de ${quando} foi cancelado. Se quiser remarcar, é só agendar pelo app. Oral Scan`,
    alteracao: `Olá, ${nome}! O escaneamento de ${a.paciente_nome} foi alterado para ${quando}, ${local}. Oral Scan`,
  }
}

export function DetalheAgendamento(props) {
  return props.ag ? <DetalheInterno key={props.ag.id} {...props} /> : null
}

function DetalheInterno({ ag, config, fechar, aoMudar }) {
  const avisar = useAviso()
  const [modo, setModo] = useState(null) // 'remarcar' | 'cancelar'
  const [dia, setDia] = useState(ag ? ymd(ag.inicio) : '')
  const [hora, setHora] = useState(ag ? hm(ag.inicio) : '')
  const [motivo, setMotivo] = useState('')
  const [devolver, setDevolver] = useState(true)
  if (!ag) return null
  const msgs = mensagensWhats(ag, config)
  const whats = ag.dentista?.whatsapp || ag.dentista?.telefone

  const acao = async (fn, ok) => {
    try { const r = await fn(); avisar(typeof r === 'string' ? r : ok); aoMudar?.(); fechar() } catch (e) { avisar(e.message, 'erro') }
  }

  return (
    <Modal titulo="Agendamento" aberto={!!ag} fechar={fechar} largura={600}>
      <div className="pilha">
        <div className="linha-entre">
          <h3 style={{ margin: 0 }}>{ag.paciente_nome}</h3>
          <Selo cor={STATUS_AG[ag.status].cor}>{STATUS_AG[ag.status].rotulo}</Selo>
        </div>
        <dl className="resumo">
          <dt>Quando</dt><dd>{dataLonga(ag.inicio)} · {hm(ag.inicio)}–{hm(ag.fim)}</dd>
          <dt>Serviço</dt><dd>{ag.servico_nome}</dd>
          <dt>Local</dt><dd>{MODALIDADE[ag.modalidade]}{ag.endereco ? ` – ${ag.endereco}` : ''}</dd>
          <dt>Dentista</dt><dd>{ag.dentista?.nome}{ag.dentista?.clinica ? ` (${ag.dentista.clinica})` : ''}</dd>
          <dt>Contato</dt><dd>{whats || '—'} {ag.dentista?.email && <span className="suave">· {ag.dentista.email}</span>}</dd>
          {ag.paciente_telefone && <><dt>Tel. paciente</dt><dd>{ag.paciente_telefone}</dd></>}
          {ag.dentes_regiao && <><dt>Dentes/região</dt><dd>{ag.dentes_regiao}</dd></>}
          {ag.observacoes && <><dt>Observações</dt><dd>{ag.observacoes}</dd></>}
          {ag.motivo_cancelamento && <><dt>Motivo canc.</dt><dd>{ag.motivo_cancelamento}</dd></>}
          <dt>Criado em</dt><dd>{dataHoraCurta(ag.criado_em)}</dd>
        </dl>
        {ag.alteracao_solicitada && <div className="alerta alerta-aviso"><strong>Dentista pediu alteração:</strong> {ag.alteracao_solicitada}</div>}

        {whats && (
          <div>
            <div className="campo-rotulo" style={{ marginBottom: 6 }}>Enviar pelo WhatsApp</div>
            <div className="linha">
              <a className="btn btn-whats btn-pequeno" target="_blank" rel="noopener" href={linkWhats(whats, msgs.confirmacao)}>Confirmação</a>
              <a className="btn btn-whats btn-pequeno" target="_blank" rel="noopener" href={linkWhats(whats, msgs.lembrete)}>Lembrete</a>
              <a className="btn btn-whats btn-pequeno" target="_blank" rel="noopener" href={linkWhats(whats, msgs.alteracao)}>Alteração</a>
              <a className="btn btn-whats btn-pequeno" target="_blank" rel="noopener" href={linkWhats(whats, msgs.cancelamento)}>Cancelamento</a>
            </div>
          </div>
        )}

        {ag.status !== 'cancelado' && !modo && (
          <div className="linha" style={{ borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
            {ag.status !== 'concluido' && <button className="btn btn-pequeno" onClick={() => acao(() => api.mudarStatus(ag.id, 'concluido'), 'Marcado como concluído.')}>✓ Concluído</button>}
            {ag.status !== 'falta' && <button className="btn btn-pequeno" onClick={() => acao(() => api.mudarStatus(ag.id, 'falta'), 'Falta registrada.')}>Registrar falta</button>}
            {ag.status !== 'agendado' && <button className="btn btn-pequeno" onClick={() => acao(() => api.mudarStatus(ag.id, 'agendado'), 'Voltou para agendado.')}>Voltar p/ agendado</button>}
            {ag.status === 'agendado' && <button className="btn btn-pequeno" onClick={() => setModo('remarcar')}>Remarcar</button>}
            {ag.status === 'agendado' && <button className="btn btn-pequeno btn-perigo" onClick={() => setModo('cancelar')}>Cancelar</button>}
          </div>
        )}

        {modo === 'remarcar' && (
          <div className="cartao pilha" style={{ boxShadow: 'none' }}>
            <div className="form">
              <Campo rotulo="Novo dia"><input type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
              <Campo rotulo="Novo horário"><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></Campo>
            </div>
            <p className="suave pequeno">Como administradora, você pode remarcar fora das regras de antecedência. O sistema só impede choque com outro atendimento.</p>
            <div className="linha">
              <button className="btn" onClick={() => setModo(null)}>Voltar</button>
              <button className="btn btn-primario" onClick={() => acao(() => api.remarcar(ag.id, dataHora(dia, hora)), 'Agendamento remarcado. Avise o dentista pelo WhatsApp.')}>Salvar novo horário</button>
            </div>
          </div>
        )}
        {modo === 'cancelar' && (
          <div className="cartao pilha" style={{ boxShadow: 'none' }}>
            <Campo rotulo="Motivo"><input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
            <label className="check"><input type="checkbox" checked={devolver} onChange={(e) => setDevolver(e.target.checked)} /> Devolver o crédito ao dentista</label>
            <div className="linha">
              <button className="btn" onClick={() => setModo(null)}>Voltar</button>
              <button className="btn btn-perigo" onClick={() => acao(() => api.cancelar(ag.id, motivo, devolver), 'Cancelado.')}>Confirmar cancelamento</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
