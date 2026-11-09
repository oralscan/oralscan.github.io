import { useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Kpi, Selo, useDados, Vazio } from '../../components/ui.jsx'
import { hoje, dataCurta, dataYmdBR, hm } from '../../lib/tempo.js'
import { resumoCreditos } from '../../lib/util.js'
import { exportarExcel } from '../../lib/exportar.js'

const situacao = (c, hj) => c.status === 'usado' ? ['Utilizado', 'azul'] : c.status === 'estornado' ? ['Estornado', 'vermelho'] : c.validade < hj ? ['Vencido', 'cinza'] : ['Disponível', 'verde']

export default function CreditosAdmin() {
  const [cliente, setCliente] = useState('')
  const [sit, setSit] = useState('')
  const { dados, carregando } = useDados(async () => {
    const [creditos, compras, ags, perfis] = await Promise.all([api.creditos(), api.compras(), api.agendamentos(), api.dentistas()])
    return { creditos, compras: new Map(compras.map((c) => [c.id, c])), ags: new Map(ags.map((a) => [a.id, a])), perfis }
  })
  const hj = hoje()
  const lista = useMemo(() => !dados ? [] : dados.creditos
    .filter((c) => (!cliente || c.dentista_id === cliente) && (!sit || situacao(c, hj)[0] === sit))
    .sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || '')), [dados, cliente, sit, hj])
  if (carregando || !dados) return <Carregando />

  const r = resumoCreditos(dados.creditos, hj)
  const nome = (id) => dados.perfis.find((p) => p.id === id)?.nome || '—'
  const saldos = dados.perfis.filter((p) => dados.creditos.some((c) => c.dentista_id === p.id))
    .map((p) => ({ p, r: resumoCreditos(dados.creditos.filter((c) => c.dentista_id === p.id), hj) }))
    .sort((a, b) => b.r.disponiveis - a.r.disponiveis)

  const linha = (c) => {
    const compra = dados.compras.get(c.compra_id), ag = c.agendamento_id ? dados.ags.get(c.agendamento_id) : null
    return { c, compra, ag, sit: situacao(c, hj) }
  }

  function excel() {
    exportarExcel(`creditos_${hj}`, {
      Créditos: lista.map(linha).map(({ c, compra, ag, sit: s }) => ({
        'ID crédito': c.id, Dentista: nome(c.dentista_id), Situação: s[0], Validade: dataYmdBR(c.validade),
        'Compra de origem': compra ? `${compra.combo_nome} – ${dataCurta(compra.criado_em)}` : c.compra_id, 'ID transação': compra?.transacao_id || '',
        'Usado no agendamento': ag ? `${dataCurta(ag.inicio)} ${hm(ag.inicio)} – ${ag.paciente_nome}` : '',
      })),
      'Saldo por cliente': saldos.map(({ p, r: x }) => ({ Dentista: p.nome, Disponíveis: x.disponiveis, Utilizados: x.usados, Vencidos: x.vencidos, Estornados: x.estornados, Total: x.total })),
    })
  }

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><h1>Créditos</h1><p>Cada crédito é rastreável: compra de origem e agendamento em que foi usado.</p></div>
        <button className="btn" onClick={excel}>Exportar Excel</button>
      </div>
      <div className="kpis">
        <Kpi destaque rotulo="Créditos vendidos" valor={r.total} />
        <Kpi rotulo="Utilizados" valor={r.usados} />
        <Kpi rotulo="Disponíveis" valor={r.disponiveis} />
        <Kpi rotulo="Vencidos" valor={r.vencidos} />
        <Kpi rotulo="Cancelados/estornados" valor={r.estornados} />
      </div>

      <div className="cartao">
        <h2>Saldo por cliente</h2>
        {saldos.length === 0 ? <Vazio titulo="Nenhum crédito vendido ainda" /> : (
          <div className="tabela-caixa">
            <table>
              <thead><tr><th>Dentista</th><th className="num">Disponíveis</th><th className="num">Utilizados</th><th className="num">Vencidos</th><th className="num">Estornados</th><th>Próx. vencimento</th></tr></thead>
              <tbody>
                {saldos.map(({ p, r: x }) => (
                  <tr key={p.id} onClick={() => setCliente(p.id)} style={{ cursor: 'pointer' }}>
                    <td>{p.nome}</td><td className="num"><strong>{x.disponiveis}</strong></td><td className="num">{x.usados}</td><td className="num">{x.vencidos}</td><td className="num">{x.estornados}</td>
                    <td>{x.proxVencimento ? dataYmdBR(x.proxVencimento) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cartao">
        <h2>Rastreio dos créditos</h2>
        <div className="filtros">
          <Campo rotulo="Dentista"><select value={cliente} onChange={(e) => setCliente(e.target.value)}><option value="">Todos</option>{saldos.map(({ p }) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Campo>
          <Campo rotulo="Situação"><select value={sit} onChange={(e) => setSit(e.target.value)}><option value="">Todas</option>{['Disponível', 'Utilizado', 'Vencido', 'Estornado'].map((s) => <option key={s}>{s}</option>)}</select></Campo>
        </div>
        {lista.length === 0 ? <Vazio titulo="Nenhum crédito no filtro" /> : (
          <div className="tabela-caixa">
            <table>
              <thead><tr><th>Crédito</th><th>Dentista</th><th>Situação</th><th>Validade</th><th>Compra de origem</th><th>Agendamento</th></tr></thead>
              <tbody>
                {lista.slice(0, 300).map(linha).map(({ c, compra, ag, sit: s }) => (
                  <tr key={c.id}>
                    <td className="pequeno suave">#{c.id.slice(0, 8)}</td>
                    <td>{nome(c.dentista_id)}</td>
                    <td><Selo cor={s[1]}>{s[0]}</Selo></td>
                    <td>{dataYmdBR(c.validade)}</td>
                    <td className="pequeno">{compra ? <>{compra.combo_nome}<div className="suave">{dataCurta(compra.criado_em)} · {compra.transacao_id || '—'}</div></> : '—'}</td>
                    <td className="pequeno">{ag ? <>{dataCurta(ag.inicio)} {hm(ag.inicio)}<div className="suave">{ag.paciente_nome}</div></> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
