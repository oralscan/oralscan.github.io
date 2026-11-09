import { useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Selo, useDados, Vazio } from '../../components/ui.jsx'
import { DetalheAgendamento } from '../../components/admin.jsx'
import { hoje, somaDias, dataHora, dataCurta, hm } from '../../lib/tempo.js'
import { MODALIDADE, STATUS_AG } from '../../lib/util.js'
import { exportarExcel, exportarPdf } from '../../lib/exportar.js'

export default function AgendamentosAdmin() {
  const [de, setDe] = useState(somaDias(hoje(), -30))
  const [ate, setAte] = useState(somaDias(hoje(), 60))
  const [status, setStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(null)
  const { dados, carregando, recarregar } = useDados(async () => {
    const [ags, config] = await Promise.all([api.agendamentos({ de: dataHora(de, '00:00'), ate: dataHora(somaDias(ate, 1), '00:00') }), api.config()])
    return { ags, config }
  }, [de, ate])

  const lista = useMemo(() => {
    if (!dados) return []
    const b = busca.trim().toLowerCase()
    return dados.ags.filter((a) =>
      (!status || a.status === status || (status === 'alteracao' && a.alteracao_solicitada && a.status === 'agendado')) &&
      (!b || [a.paciente_nome, a.dentista?.nome, a.dentista?.clinica, a.servico_nome].some((x) => (x || '').toLowerCase().includes(b))))
  }, [dados, status, busca])

  const contagem = (s) => dados?.ags.filter((a) => a.status === s).length || 0

  function excel() {
    exportarExcel(`agendamentos_${de}_a_${ate}`, {
      Agendamentos: lista.map((a) => ({
        Data: dataCurta(a.inicio), Início: hm(a.inicio), Fim: hm(a.fim), Status: STATUS_AG[a.status].rotulo,
        Dentista: a.dentista?.nome, Clínica: a.dentista?.clinica, Serviço: a.servico_nome, Local: MODALIDADE[a.modalidade],
        Endereço: a.endereco, Paciente: a.paciente_nome, 'Tel. paciente': a.paciente_telefone, 'Dentes/região': a.dentes_regiao, Observações: a.observacoes,
      })),
    })
  }

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><h1>Agendamentos</h1><p>Histórico completo com dentista, paciente, serviço e endereço.</p></div>
        <div className="linha nao-imprimir">
          <button className="btn" onClick={excel}>Exportar Excel</button>
          <button className="btn" onClick={exportarPdf}>PDF</button>
        </div>
      </div>
      <div className="filtros nao-imprimir">
        <Campo rotulo="De"><input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></Campo>
        <Campo rotulo="Até"><input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></Campo>
        <Campo rotulo="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="agendado">Agendados ({contagem('agendado')})</option>
            <option value="concluido">Concluídos ({contagem('concluido')})</option>
            <option value="falta">Faltas ({contagem('falta')})</option>
            <option value="cancelado">Cancelados ({contagem('cancelado')})</option>
            <option value="alteracao">Com pedido de alteração</option>
          </select>
        </Campo>
        <Campo rotulo="Buscar"><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Paciente, dentista, serviço" /></Campo>
      </div>
      {carregando || !dados ? <Carregando /> : lista.length === 0 ? <div className="cartao"><Vazio titulo="Nenhum agendamento no filtro" /></div> : (
        <div className="tabela-caixa">
          <table>
            <thead><tr><th>Data</th><th>Paciente</th><th>Dentista</th><th>Serviço</th><th>Local</th><th>Status</th></tr></thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id} onClick={() => setAberto(a)} style={{ cursor: 'pointer' }}>
                  <td>{dataCurta(a.inicio)}<div className="suave pequeno">{hm(a.inicio)}–{hm(a.fim)}</div></td>
                  <td>{a.paciente_nome}{a.dentes_regiao && <div className="suave pequeno">{a.dentes_regiao}</div>}</td>
                  <td>{a.dentista?.nome}<div className="suave pequeno">{a.dentista?.clinica}</div></td>
                  <td>{a.servico_nome}</td>
                  <td>{MODALIDADE[a.modalidade]}{a.modalidade === 'externo' && <div className="suave pequeno">{a.endereco}</div>}</td>
                  <td>
                    <Selo cor={STATUS_AG[a.status].cor}>{STATUS_AG[a.status].rotulo}</Selo>
                    {a.alteracao_solicitada && a.status === 'agendado' && <div><Selo cor="amarelo">Pediu alteração</Selo></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DetalheAgendamento ag={aberto} config={dados?.config} fechar={() => setAberto(null)} aoMudar={recarregar} />
    </div>
  )
}
