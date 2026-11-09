import { dataHora, diaSemana, addMin, minutos } from './tempo.js'

// Quanto tempo o scanner/executor fica preso antes e depois do atendimento.
export function folgas({ modalidade, regiao, config }) {
  if (modalidade === 'externo') {
    const desl = Number(regiao?.deslocamento_min || 0)
    return { pre: desl, pos: Math.max(desl, Number(config.intervalo_externo_min || 0)) }
  }
  return { pre: 0, pos: Number(config.intervalo_min || 0) }
}

const sobrepoe = (a1, a2, b1, b2) => a1 < b2 && b1 < a2

/**
 * Horários livres de um dia.
 * ocupacao: [{ini, fim, tipo:'agendamento'|'bloqueio'}] já com folgas incluídas (vem do banco).
 */
export function horariosLivres({ dia, servico, modalidade, regiao, config, ocupacao, agora = new Date(), ignorarAntecedencia = false }) {
  if (!servico || !config) return []
  const janelas = config.horarios?.[String(diaSemana(dia))] || []
  const dur = Number(servico.duracao_min)
  const passo = Math.max(5, Number(config.passo_min || 30))
  const { pre, pos } = folgas({ modalidade, regiao, config })
  const limite = ignorarAntecedencia ? agora : addMin(agora, Number(config.antecedencia_horas || 0) * 60)
  const ocup = (ocupacao || []).map((o) => ({ ini: new Date(o.ini).getTime(), fim: new Date(o.fim).getTime(), tipo: o.tipo }))
  const livres = []

  for (const j of janelas) {
    const fimJanela = minutos(j.fim)
    for (let m = minutos(j.ini); m + dur <= fimJanela; m += passo) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0')
      const mm = String(m % 60).padStart(2, '0')
      const ini = dataHora(dia, `${hh}:${mm}`)
      const fim = addMin(ini, dur)
      if (ini < limite) continue
      const oIni = addMin(ini, -pre).getTime()
      const oFim = addMin(fim, pos).getTime()
      const conflito = ocup.some((o) =>
        o.tipo === 'bloqueio'
          ? sobrepoe(oIni, fim.getTime(), o.ini, o.fim)
          : sobrepoe(oIni, oFim, o.ini, o.fim))
      if (!conflito) livres.push({ inicio: ini, fim })
    }
  }
  return livres
}
