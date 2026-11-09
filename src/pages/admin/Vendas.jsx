import { useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Kpi, Modal, Selo, useAviso, useDados, Vazio } from '../../components/ui.jsx'
import { hoje, somaDias, dataCurta, dataHoraCurta, diaSemana, moeda, ymd } from '../../lib/tempo.js'
import { STATUS_COMPRA } from '../../lib/util.js'
import { exportarExcel, exportarPdf } from '../../lib/exportar.js'

function periodoRapido(p) {
  const hj = hoje()
  if (p === 'dia') return [hj, hj]
  if (p === 'semana') return [somaDias(hj, -diaSemana(hj)), hj]
  if (p === 'mes') return [hj.slice(0, 8) + '01', hj]
  if (p === 'ano') return [hj.slice(0, 5) + '01-01', hj]
  return null
}

export default function Vendas() {
  const avisar = useAviso()
  const [rapido, setRapido] = useState('mes')
  const [[de, ate], setPeriodo] = useState(periodoRapido('mes'))
  const [combo, setCombo] = useState('')
  const [cliente, setCliente] = useState('')
  const [status, setStatus] = useState('')
  const [acao, setAcao] = useState(null)
  const arquivo = useRef(null)
  const { dados, carregando, recarregar } = useDados(async () => {
    const [compras, combos] = await Promise.all([api.compras(), api.combos()])
    return { compras, combos }
  })

  const filtradas = useMemo(() => {
    if (!dados) return []
    return dados.compras.filter((c) => {
      const d = ymd(c.criado_em)
      return d >= de && d <= ate && (!combo || c.combo_nome === combo) && (!cliente || c.dentista_id === cliente) && (!status || c.status === status)
    })
  }, [dados, de, ate, combo, cliente, status])

  if (carregando || !dados) return <Carregando />

  const pagas = filtradas.filter((c) => c.status === 'pago')
  const bruto = filtradas.filter((c) => ['pago', 'estornado'].includes(c.status)).reduce((s, c) => s + Number(c.valor), 0)
  const recebido = pagas.reduce((s, c) => s + Number(c.valor), 0)
  const pendentes = filtradas.filter((c) => c.status === 'pendente')
  const estornos = filtradas.filter((c) => ['estornado', 'cancelado'].includes(c.status))
  const compradores = new Set(pagas.map((c) => c.dentista_id)).size
  const porCombo = {}
  pagas.forEach((c) => { porCombo[c.combo_nome] = porCombo[c.combo_nome] || { n: 0, v: 0 }; porCombo[c.combo_nome].n++; porCombo[c.combo_nome].v += Number(c.valor) })
  const maxV = Math.max(1, ...Object.values(porCombo).map((x) => x.v))
  const clientes = [...new Map(dados.compras.map((c) => [c.dentista_id, c.dentista?.nome || '—'])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  const nomesCombos = [...new Set([...dados.combos.map((c) => c.nome), ...dados.compras.map((c) => c.combo_nome)])]

  async function executar() {
    const { tipo, c } = acao
    try {
      if (tipo === 'liberar') await api.liberarCompra(c.id)
      if (tipo === 'estornar') await api.estornarCompra(c.id)
      if (tipo === 'cancelar') await api.cancelarCompra(c.id)
      avisar({ liberar: 'Pagamento confirmado e créditos liberados.', estornar: 'Estorno registrado; créditos não usados foram cancelados.', cancelar: 'Compra cancelada.' }[tipo])
      setAcao(null); recarregar()
    } catch (er) { avisar(er.message, 'erro') }
  }
  async function anexar(e) {
    const f = e.target.files?.[0]
    if (!f || !acao) return
    try { await api.anexarNota(acao.c, f); avisar('Nota fiscal anexada. O dentista já pode baixar.'); setAcao(null); recarregar() } catch (er) { avisar(er.message, 'erro') }
    e.target.value = ''
  }

  function excel() {
    exportarExcel(`vendas_${de}_a_${ate}`, {
      Vendas: filtradas.map((c) => ({
        'Data da compra': dataHoraCurta(c.criado_em), Comprador: c.dentista?.nome, 'E-mail': c.dentista?.email, Combo: c.combo_nome,
        Créditos: c.qtd_creditos, 'Valor (R$)': Number(c.valor), Status: STATUS_COMPRA[c.status].rotulo,
        'Pago em': c.pago_em ? dataHoraCurta(c.pago_em) : '', 'ID transação': c.transacao_id || '', Gateway: c.gateway, 'NF anexada': c.nf_path ? 'Sim' : 'Não',
      })),
      'Por combo': Object.entries(porCombo).map(([nome, x]) => ({ Combo: nome, Vendas: x.n, 'Faturamento (R$)': x.v })),
      Resumo: [
        { Indicador: 'Período', Valor: `${dataCurta(de + 'T12:00:00-03:00')} a ${dataCurta(ate + 'T12:00:00-03:00')}` },
        { Indicador: 'Combos vendidos', Valor: pagas.length }, { Indicador: 'Faturamento bruto (R$)', Valor: bruto },
        { Indicador: 'Valor recebido (R$)', Valor: recebido }, { Indicador: 'Clientes compradores', Valor: compradores },
        { Indicador: 'Ticket médio (R$)', Valor: pagas.length ? recebido / pagas.length : 0 },
        { Indicador: 'Pagamentos pendentes', Valor: pendentes.length }, { Indicador: 'Cancelamentos/estornos', Valor: estornos.length },
      ],
    })
  }

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><h1>Vendas</h1><p>Controle de vendas, pagamentos e relatórios financeiros.</p></div>
        <div className="linha nao-imprimir">
          <button className="btn" onClick={excel}>Exportar Excel</button>
          <button className="btn" onClick={exportarPdf}>PDF</button>
        </div>
      </div>
      <div className="pilulas nao-imprimir">
        {[['dia', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano'], ['pers', 'Personalizado']].map(([v, r]) => (
          <button key={v} className={`pilula ${rapido === v ? 'ativa' : ''}`} onClick={() => { setRapido(v); const p = periodoRapido(v); if (p) setPeriodo(p) }}>{r}</button>
        ))}
      </div>
      <div className="filtros nao-imprimir">
        <Campo rotulo="De"><input type="date" value={de} onChange={(e) => { setRapido('pers'); setPeriodo([e.target.value, ate]) }} /></Campo>
        <Campo rotulo="Até"><input type="date" value={ate} onChange={(e) => { setRapido('pers'); setPeriodo([de, e.target.value]) }} /></Campo>
        <Campo rotulo="Combo"><select value={combo} onChange={(e) => setCombo(e.target.value)}><option value="">Todos</option>{nomesCombos.map((n) => <option key={n}>{n}</option>)}</select></Campo>
        <Campo rotulo="Cliente"><select value={cliente} onChange={(e) => setCliente(e.target.value)}><option value="">Todos</option>{clientes.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></Campo>
        <Campo rotulo="Status"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(STATUS_COMPRA).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}</select></Campo>
      </div>

      <div className="kpis">
        <Kpi destaque rotulo="Valor recebido" valor={moeda(recebido)} detalhe={`${pagas.length} pagamento(s) confirmados`} />
        <Kpi rotulo="Faturamento bruto" valor={moeda(bruto)} detalhe="inclui vendas estornadas" />
        <Kpi rotulo="Combos vendidos" valor={pagas.length} />
        <Kpi rotulo="Ticket médio" valor={moeda(pagas.length ? recebido / pagas.length : 0)} />
        <Kpi rotulo="Clientes compradores" valor={compradores} />
        <Kpi rotulo="Pendentes" valor={pendentes.length} detalhe={moeda(pendentes.reduce((s, c) => s + Number(c.valor), 0))} />
        <Kpi rotulo="Cancel./estornos" valor={estornos.length} detalhe={moeda(estornos.reduce((s, c) => s + Number(c.valor), 0))} />
      </div>

      {Object.keys(porCombo).length > 0 && (
        <div className="cartao">
          <h2>Vendas por tipo de combo</h2>
          <div className="barras">
            {Object.entries(porCombo).sort((a, b) => b[1].v - a[1].v).map(([nome, x]) => (
              <div className="barra-linha" key={nome}>
                <span>{nome}</span>
                <div className="barra-trilho"><div className="barra-cheia" style={{ width: `${(x.v / maxV) * 100}%` }} /></div>
                <span className="barra-valor">{x.n} · {moeda(x.v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtradas.length === 0 ? <div className="cartao"><Vazio titulo="Nenhuma venda no período" /></div> : (
        <div className="tabela-caixa">
          <table>
            <thead><tr><th>Data</th><th>Comprador</th><th>Combo</th><th className="num">Valor</th><th>Status</th><th>Transação</th><th className="nao-imprimir"></th></tr></thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id}>
                  <td>{dataHoraCurta(c.criado_em)}</td>
                  <td>{c.dentista?.nome}<div className="suave pequeno">{c.dentista?.clinica}</div></td>
                  <td>{c.combo_nome}<div className="suave pequeno">{c.qtd_creditos} crédito(s)</div></td>
                  <td className="num">{moeda(c.valor)}</td>
                  <td><Selo cor={STATUS_COMPRA[c.status].cor}>{STATUS_COMPRA[c.status].rotulo}</Selo>{c.pago_em && <div className="suave pequeno">pago {dataHoraCurta(c.pago_em)}</div>}</td>
                  <td className="pequeno">{c.transacao_id || '—'}<div className="suave">{c.gateway}{c.nf_path ? ' · NF ✓' : ''}</div></td>
                  <td className="num nao-imprimir">
                    <div className="linha" style={{ justifyContent: 'flex-end' }}>
                      {c.status === 'pendente' && <button className="btn btn-pequeno" onClick={() => setAcao({ tipo: 'liberar', c })}>Confirmar pgto.</button>}
                      {c.status === 'pendente' && <button className="btn btn-pequeno" onClick={() => setAcao({ tipo: 'cancelar', c })}>Cancelar</button>}
                      {c.status === 'pago' && <button className="btn btn-pequeno" onClick={() => setAcao({ tipo: 'nf', c })}>{c.nf_path ? 'Trocar NF' : 'Anexar NF'}</button>}
                      {c.status === 'pago' && <button className="btn btn-pequeno btn-perigo" onClick={() => setAcao({ tipo: 'estornar', c })}>Estornar</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal titulo={acao?.tipo === 'nf' ? 'Anexar nota fiscal' : 'Confirmar ação'} aberto={!!acao} fechar={() => setAcao(null)}>
        {acao && (
          <div className="pilha">
            <p><strong>{acao.c.dentista?.nome}</strong> · {acao.c.combo_nome} · {moeda(acao.c.valor)}</p>
            {acao.tipo === 'liberar' && <div className="alerta alerta-aviso">Confirme somente depois de ver o PIX no extrato. Os {acao.c.qtd_creditos} crédito(s) serão liberados na hora. (Com o Mercado Pago configurado isso acontece sozinho.)</div>}
            {acao.tipo === 'estornar' && <div className="alerta alerta-aviso">Registra o estorno e cancela os créditos ainda não usados. A devolução do dinheiro deve ser feita no banco/Mercado Pago.</div>}
            {acao.tipo === 'cancelar' && <p>Cancelar esta compra pendente?</p>}
            {acao.tipo === 'nf' ? (
              <>
                <input ref={arquivo} type="file" accept=".pdf,.xml,image/*" onChange={anexar} />
                <p className="suave pequeno">PDF, XML ou imagem. O dentista baixa pelo app (Combos → Minhas compras).</p>
              </>
            ) : (
              <div className="linha" style={{ justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setAcao(null)}>Voltar</button>
                <button className={`btn ${acao.tipo === 'estornar' ? 'btn-perigo' : 'btn-primario'}`} onClick={executar}>Confirmar</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
