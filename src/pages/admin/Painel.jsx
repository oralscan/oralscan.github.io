import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { Carregando, Kpi, Selo, useDados, Vazio } from '../../components/ui.jsx'
import { DetalheAgendamento } from '../../components/admin.jsx'
import { hoje, somaDias, dataHora, hm, diaMes, moeda, dataLonga, addMin } from '../../lib/tempo.js'
import { horariosLivres } from '../../lib/agenda.js'
import { MODALIDADE, resumoCreditos } from '../../lib/util.js'

export default function Painel() {
  const [aberto, setAberto] = useState(null)
  const { dados, carregando, recarregar } = useDados(async () => {
    const hj = hoje()
    const [compras, creditos, ags, config, servicos, bloqueios] = await Promise.all([
      api.compras(), api.creditos(), api.agendamentos({ de: dataHora(somaDias(hj, -60), '00:00') }),
      api.config(), api.servicos(), api.bloqueios(),
    ])
    const ocup = await api.ocupacao(dataHora(hj, '00:00'), addMin(dataHora(somaDias(hj, 8), '00:00'), 180))
    return { compras, creditos, ags, config, servicos, bloqueios, ocup }
  })
  if (carregando || !dados) return <Carregando />

  const hj = hoje()
  const mes = hj.slice(0, 7)
  const pagosMes = dados.compras.filter((c) => c.status === 'pago' && (c.pago_em || c.criado_em).slice(0, 7) === mes)
  const faturamentoMes = pagosMes.reduce((s, c) => s + Number(c.valor), 0)
  const pendentes = dados.compras.filter((c) => c.status === 'pendente')
  const totalVendas = dados.compras.filter((c) => c.status === 'pago').length
  const porCombo = {}
  dados.compras.filter((c) => c.status === 'pago').forEach((c) => { porCombo[c.combo_nome] = (porCombo[c.combo_nome] || 0) + 1 })
  const ranking = Object.entries(porCombo).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxRank = Math.max(1, ...ranking.map((r) => r[1]))
  const cr = resumoCreditos(dados.creditos, hj)
  const agora = new Date()
  const proximos = dados.ags.filter((a) => a.status === 'agendado' && new Date(a.fim) > agora)
  const pedidos = proximos.filter((a) => a.alteracao_solicitada)

  // horários livres (serviço mais curto, na sede) nos próximos 7 dias, sem a trava de antecedência
  const curto = [...dados.servicos].filter((s) => s.ativo).sort((a, b) => a.duracao_min - b.duracao_min)[0]
  let livres = 0
  for (let i = 0; i < 7; i++) livres += horariosLivres({ dia: somaDias(hj, i), servico: curto, modalidade: 'sede', config: dados.config, ocupacao: dados.ocup, ignorarAntecedencia: true }).length
  const limite7 = dataHora(somaDias(hj, 7), '23:59')
  const bloqFuturos = dados.bloqueios.filter((b) => new Date(b.fim) > agora)
  const horasBloq = bloqFuturos.filter((b) => new Date(b.inicio) < limite7)
    .reduce((s, b) => s + (Math.min(new Date(b.fim), limite7) - Math.max(new Date(b.inicio), agora)) / 3600000, 0)

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Painel</h1>
          <p>{dataLonga(new Date())} · visão geral da operação</p>
        </div>
        <Link className="btn btn-primario" to="/admin/agenda">Abrir agenda</Link>
      </div>

      <div className="kpis">
        <Kpi destaque rotulo="Faturamento do mês" valor={moeda(faturamentoMes)} detalhe={`${pagosMes.length} venda(s) pagas`} />
        <Kpi rotulo="Total de vendas" valor={totalVendas} detalhe="combos pagos" />
        <Kpi rotulo="Escaneamentos agendados" valor={proximos.length} detalhe="a realizar" />
        <Kpi rotulo="Créditos vendidos" valor={cr.total} detalhe={`${cr.usados} utilizados · ${cr.disponiveis} em aberto`} />
        <Kpi rotulo="Pagamentos pendentes" valor={pendentes.length} detalhe={moeda(pendentes.reduce((s, c) => s + Number(c.valor), 0))} />
        <Kpi rotulo="Horários livres (7 dias)" valor={livres} detalhe={curto ? `encaixes de ${curto.duracao_min} min na sede` : ''} />
        <Kpi rotulo="Horas bloqueadas (7 dias)" valor={horasBloq.toFixed(1).replace('.', ',') + ' h'} detalhe={`${bloqFuturos.length} bloqueio(s) futuros`} />
      </div>

      {pedidos.length > 0 && (
        <div className="alerta alerta-aviso">
          <strong>{pedidos.length} pedido(s) de alteração</strong> aguardando você:{' '}
          {pedidos.map((a) => <button key={a.id} className="btn-link" onClick={() => setAberto(a)}>{a.paciente_nome} ({diaMes(a.inicio)})</button>)}
        </div>
      )}

      <div className="grade-2">
        <div className="cartao">
          <div className="cartao-titulo"><h2>Próximos atendimentos</h2><Link className="pequeno" to="/admin/agendamentos">Ver todos</Link></div>
          {proximos.length === 0 ? <Vazio titulo="Nenhum atendimento agendado" /> : (
            <div className="pilha">
              {proximos.slice(0, 6).map((a) => (
                <button className="item" key={a.id} onClick={() => setAberto(a)} style={{ textAlign: 'left', cursor: 'pointer' }}>
                  <div className="item-data"><b>{diaMes(a.inicio).split(' ')[0]}</b><small>{diaMes(a.inicio).split(' ').slice(-1)}</small></div>
                  <div className="item-corpo">
                    <h4>{hm(a.inicio)} · {a.paciente_nome}</h4>
                    <div className="suave pequeno">{a.dentista?.nome} · {a.servico_nome}</div>
                    <Selo cor={a.modalidade === 'externo' ? 'amarelo' : 'azul'}>{MODALIDADE[a.modalidade]}</Selo>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="pilha">
          <div className="cartao">
            <div className="cartao-titulo"><h2>Combos mais vendidos</h2></div>
            {ranking.length === 0 ? <Vazio titulo="Sem vendas ainda" /> : (
              <div className="barras">
                {ranking.map(([nome, n]) => (
                  <div className="barra-linha" key={nome}>
                    <span>{nome}</span>
                    <div className="barra-trilho"><div className="barra-cheia" style={{ width: `${(n / maxRank) * 100}%` }} /></div>
                    <span className="barra-valor">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="cartao">
            <div className="cartao-titulo"><h2>Pagamentos pendentes</h2><Link className="pequeno" to="/admin/vendas">Vendas</Link></div>
            {pendentes.length === 0 ? <Vazio titulo="Nenhum pagamento pendente" /> : (
              <div className="pilha">
                {pendentes.slice(0, 5).map((c) => (
                  <div className="linha-entre pequeno" key={c.id}>
                    <span><strong>{c.dentista?.nome}</strong> · {c.combo_nome}</span>
                    <span>{moeda(c.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <DetalheAgendamento ag={aberto} config={dados.config} fechar={() => setAberto(null)} aoMudar={recarregar} />
    </div>
  )
}
