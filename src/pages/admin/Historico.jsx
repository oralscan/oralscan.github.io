import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Campo, Carregando, useDados, Vazio } from '../../components/ui.jsx'
import { dataHoraCurta } from '../../lib/tempo.js'

const TABELAS = { agendamentos: 'Agendamentos', compras: 'Compras', combos: 'Combos', bloqueios: 'Bloqueios', config: 'Configurações', servicos: 'Serviços', regioes: 'Regiões', perfis: 'Cadastros' }
const ACOES = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Excluiu' }
const OCULTOS = ['pix_qr_base64', 'pix_copia_cola', 'ocupa', 'atualizado_em', 'criado_em']

function mudancas(h) {
  if (!h.antes || !h.depois) {
    const d = h.depois || h.antes || {}
    return d.nome || d.paciente_nome || d.combo_nome || d.motivo || ''
  }
  return Object.keys(h.depois).filter((k) => !OCULTOS.includes(k) && JSON.stringify(h.antes[k]) !== JSON.stringify(h.depois[k]))
    .map((k) => `${k}: ${fmt(h.antes[k])} → ${fmt(h.depois[k])}`).join(' · ')
}
const fmt = (v) => v == null || v === '' ? '—' : typeof v === 'object' ? '(…)' : String(v).length > 40 ? String(v).slice(0, 40) + '…' : String(v)

export default function Historico() {
  const [tabela, setTabela] = useState('')
  const { dados, carregando } = useDados(async () => {
    const [aud, perfis] = await Promise.all([api.auditoria(), api.dentistas()])
    return { aud, nomes: new Map(perfis.map((p) => [p.id, p.nome])) }
  })
  if (carregando || !dados) return <Carregando />
  const lista = dados.aud.filter((h) => !tabela || h.tabela === tabela)
  return (
    <div className="pilha">
      <div className="cabecalho"><div><h1>Histórico de alterações</h1><p>Registro automático de tudo o que foi criado, alterado ou excluído (últimos 300 eventos).</p></div></div>
      <div className="filtros">
        <Campo rotulo="Área"><select value={tabela} onChange={(e) => setTabela(e.target.value)}><option value="">Todas</option>{Object.entries(TABELAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
      </div>
      {lista.length === 0 ? <div className="cartao"><Vazio titulo="Nenhum registro" /></div> : (
        <div className="tabela-caixa">
          <table>
            <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhes</th></tr></thead>
            <tbody>
              {lista.map((h) => (
                <tr key={h.id}>
                  <td>{dataHoraCurta(h.em)}</td>
                  <td>{h.usuario ? dados.nomes.get(h.usuario) || 'Usuário' : 'Sistema / pagamento'}</td>
                  <td>{ACOES[h.acao] || h.acao} · {TABELAS[h.tabela] || h.tabela}</td>
                  <td className="pequeno">{mudancas(h) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
