import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useSessao } from '../../App.jsx'
import { Carregando, Selo, useDados, Vazio } from '../../components/ui.jsx'
import { hoje, hm, diaMes, dataLonga, dataYmdBR } from '../../lib/tempo.js'
import { resumoCreditos, MODALIDADE, STATUS_COMPRA } from '../../lib/util.js'

export default function Inicio() {
  const { perfil } = useSessao()
  const { dados, carregando } = useDados(async () => {
    const [ags, creds, compras] = await Promise.all([api.meusAgendamentos(), api.meusCreditos(), api.minhasCompras()])
    return { ags, creds, compras }
  })
  if (carregando || !dados) return <Carregando />
  const r = resumoCreditos(dados.creds, hoje())
  const agora = new Date()
  const proximos = dados.ags.filter((a) => a.status === 'agendado' && new Date(a.inicio) > agora).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const pendentes = dados.compras.filter((c) => c.status === 'pendente')
  const primeiroNome = (perfil?.nome || '').replace(/^(dr|dra)\.?\s+/i, '').split(' ')[0]

  return (
    <div className="pilha">
      <div>
        <h1>Olá, {primeiroNome || "doutor(a)"}</h1>
        <p className="suave">Seu painel de escaneamentos intraorais.</p>
      </div>

      <div className="cartao cartao-destaque">
        <div className="linha-entre">
          <div>
            <div className="suave pequeno">Créditos disponíveis</div>
            <div className="numero-grande">{r.disponiveis}</div>
            {r.proxVencimento && <div className="suave pequeno mt">Próximo vencimento: {dataYmdBR(r.proxVencimento)}</div>}
            {r.vencidos > 0 && <div className="suave pequeno">{r.vencidos} crédito(s) vencido(s)</div>}
          </div>
          <div className="pilha" style={{ gap: 8 }}>
            {r.disponiveis > 0
              ? <Link className="btn" to="/agendar">Agendar escaneamento</Link>
              : <Link className="btn" to="/combos">Comprar combo</Link>}
            {r.disponiveis > 0 && <Link className="btn-link" style={{ color: '#fff' }} to="/combos">Comprar mais créditos</Link>}
          </div>
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="alerta alerta-aviso">
          Você tem {pendentes.length} compra(s) aguardando pagamento.{' '}
          <Link to={`/compra/${pendentes[0].id}`}><strong>Ver PIX</strong></Link>
        </div>
      )}

      <div className="cartao">
        <div className="cartao-titulo">
          <h2>Próximos escaneamentos</h2>
          <Link to="/agendamentos" className="pequeno">Ver todos</Link>
        </div>
        {proximos.length === 0 ? (
          <Vazio titulo="Nenhum escaneamento agendado">Agende com pelo menos 48 horas de antecedência.</Vazio>
        ) : (
          <div className="pilha">
            {proximos.slice(0, 4).map((a) => (
              <div className="item" key={a.id}>
                <div className="item-data"><b>{diaMes(a.inicio).split(' ')[0]}</b><small>{diaMes(a.inicio).split(' ').slice(-1)}</small></div>
                <div className="item-corpo">
                  <h4>{a.paciente_nome}</h4>
                  <div className="suave pequeno">{dataLonga(a.inicio)} · {hm(a.inicio)}</div>
                  <div className="linha mt" style={{ marginTop: 6 }}>
                    <Selo cor="primaria">{a.servico_nome}</Selo>
                    <Selo cor={a.modalidade === 'externo' ? 'amarelo' : 'azul'}>{MODALIDADE[a.modalidade]}</Selo>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dados.compras.some((c) => c.nf_path) && (
        <div className="cartao">
          <div className="cartao-titulo"><h2>Notas fiscais</h2></div>
          <div className="pilha">
            {dados.compras.filter((c) => c.nf_path).map((c) => (
              <div className="linha-entre" key={c.id}>
                <div><strong>{c.combo_nome}</strong> <Selo cor={STATUS_COMPRA[c.status].cor}>{STATUS_COMPRA[c.status].rotulo}</Selo></div>
                <BotaoNota compra={c} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function BotaoNota({ compra }) {
  if (!compra.nf_path) return null
  return (
    <button className="btn btn-pequeno" onClick={async () => {
      const url = await api.urlNota(compra.nf_path)
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'
      a.download = `NF-${compra.combo_nome}`; a.click()
    }}>Baixar NF</button>
  )
}
