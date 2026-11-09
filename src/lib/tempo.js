// Tudo em horário de Brasília (UTC-3, sem horário de verão desde 2019).
export const TZ = 'America/Sao_Paulo'

export const dataHora = (ymd, hm) => new Date(`${ymd}T${hm}:00-03:00`)

const fmt = (opts) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...opts })
const fYmd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const fHm = fmt({ hour: '2-digit', minute: '2-digit', hour12: false })

export const ymd = (d) => fYmd.format(new Date(d))
export const hm = (d) => fHm.format(new Date(d))
export const hoje = () => ymd(new Date())
export const diaSemana = (ymdStr) => new Date(`${ymdStr}T12:00:00-03:00`).getUTCDay()
export const somaDias = (ymdStr, n) => {
  const d = new Date(`${ymdStr}T12:00:00-03:00`)
  d.setUTCDate(d.getUTCDate() + n)
  return ymd(d)
}
export const minutos = (hmStr) => { const [h, m] = hmStr.split(':').map(Number); return h * 60 + m }
export const addMin = (d, m) => new Date(new Date(d).getTime() + m * 60000)

export const dataLonga = (d) => fmt({ weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(d))
export const dataCurta = (d) => fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
export const dataHoraCurta = (d) => `${dataCurta(d)} ${hm(d)}`
export const diaMes = (d) => fmt({ day: '2-digit', month: 'short' }).format(new Date(d)).replace('.', '')
export const nomeMes = (ymdStr) => fmt({ month: 'long', year: 'numeric' }).format(new Date(`${ymdStr}T12:00:00-03:00`))
export const dataYmdBR = (s) => s ? s.split('-').reverse().join('/') : ''

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
