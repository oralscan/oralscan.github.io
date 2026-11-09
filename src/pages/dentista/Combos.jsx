import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { Carregando, Modal, Selo, useAviso, useDados, Vazio } from '../../components/ui.jsx'
import { hoje, dataCurta, dataYmdBR } from '../../lib/tempo.js'
import { moeda } from '../../lib/tempo.js'
import { MODALIDADE, precoAtual, STATUS_COMPRA, plural } from '../../lib/util.js'
import { BotaoNota } from './Inicio.jsx'

export default function Combos() {
  const avisar = useAviso()
  const nav = useNavigate()
  const [escolhido, setEscolhido] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { dados, carregando } = useDados(async () => {
    const [combos, compras] = await Promise.all([api.combos(), api.minhasCompras()])
    return { combos: combos.filter((c) => c.ativo), compras }
  })
  if (carregando || !dados) return <Carregando />
  const hj = hoje()

  async function comprar() {
    setEnviando(true)
    try {
      const c = await api.criarCompra(escolhido.id)
      nav(`/compra/${c.id}`)
    } catch (e) { avisar(e.message, 'erro') } finally { setEnviando(false) }
  }

  return (
    <div className="pilha">
      <div>
        <h1>Combos de escaneamento</h1>
        <p className="suave">Compre créditos e agende quando precisar. Pagamento por PIX com liberação automática.</p>
      </div>
      {dados.combos.length === 0 ? <div className="cartao"><Vazio titulo="Nenhum combo disponível no momento" /></div> : (
        <div className="grade">
          {dados.combos.map((c) => {
            const preco = precoAtual(c, hj)
            const promo = preco < Number(c.preco)
            return (
              <div className="cartao combo" key={c.id}>
                {promo && <span className="combo-fita"><Selo cor="amarelo">Promoção</Selo></span>}
                <h3>{c.nome}</h3>
                <div className="combo-preco">{promo && <s>{moeda(c.preco)}</s>}{moeda(preco)}</div>
                <div className="suave pequeno">{plural(c.qtd_creditos, 'escaneamento', 'escaneamentos')} · {moeda(preco / c.qtd_creditos)} cada</div>
                {c.descricao && <p style={{ margin: 0 }}>{c.descricao}</p>}
                <ul className="pequeno suave" style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Validade: {c.validade_dias} dias após o pagamento</li>
                  <li>Atendimento: {MODALIDADE[c.modalidade]}</li>
                  {promo && c.promocao_ate && <li>Promoção até {dataYmdBR(c.promocao_ate)}</li>}
                </ul>
                {c.condicoes && <div className="pequeno suave">{c.condicoes}</div>}
                <button className="btn btn-primario mt" onClick={() => setEscolhido({ ...c, valor: preco })}>Comprar</button>
              </div>
            )
          })}
        </div>
      )}

      {dados.compras.length > 0 && (
        <div className="cartao">
          <h2>Minhas compras</h2>
          <div className="tabela-caixa">
            <table>
              <thead><tr><th>Data</th><th>Combo</th><th className="num">Valor</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {dados.compras.map((c) => (
                  <tr key={c.id}>
                    <td>{dataCurta(c.criado_em)}</td>
                    <td>{c.combo_nome}<div className="suave pequeno">{plural(c.qtd_creditos, 'crédito', 'créditos')}</div></td>
                    <td className="num">{moeda(c.valor)}</td>
                    <td><Selo cor={STATUS_COMPRA[c.status].cor}>{STATUS_COMPRA[c.status].rotulo}</Selo></td>
                    <td className="num">
                      {c.status === 'pendente' && <Link className="btn btn-pequeno" to={`/compra/${c.id}`}>Pagar</Link>}
                      <BotaoNota compra={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal titulo="Resumo da compra" aberto={!!escolhido} fechar={() => setEscolhido(null)}>
        {escolhido && (
          <div className="pilha">
            <dl className="resumo">
              <dt>Combo</dt><dd>{escolhido.nome}</dd>
              <dt>Escaneamentos</dt><dd>{escolhido.qtd_creditos}</dd>
              <dt>Validade</dt><dd>{escolhido.validade_dias} dias após o pagamento</dd>
              <dt>Atendimento</dt><dd>{MODALIDADE[escolhido.modalidade]}</dd>
              <dt>Total</dt><dd style={{ fontSize: '1.2rem' }}>{moeda(escolhido.valor)}</dd>
            </dl>
            <div className="alerta alerta-info pequeno">Os créditos são liberados automaticamente assim que o pagamento PIX for confirmado.</div>
            <button className="btn btn-primario" disabled={enviando} onClick={comprar}>{enviando ? 'Gerando…' : 'Gerar PIX'}</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
