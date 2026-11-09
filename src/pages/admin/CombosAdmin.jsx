import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Modal, Selo, useAviso, useDados, Vazio } from '../../components/ui.jsx'
import { hoje, moeda, dataYmdBR, dataHoraCurta } from '../../lib/tempo.js'
import { MODALIDADE, precoAtual, plural } from '../../lib/util.js'

const NOVO = { nome: '', descricao: '', qtd_creditos: 5, preco: 0, preco_promocional: null, promocao_ate: null, validade_dias: 180, condicoes: '', modalidade: 'ambos', ativo: true }

export default function CombosAdmin() {
  const avisar = useAviso()
  const [ed, setEd] = useState(null)
  const [desconto, setDesconto] = useState('')
  const { dados, carregando, recarregar } = useDados(async () => {
    const [combos, aud] = await Promise.all([api.combos(), api.auditoria()])
    return { combos, hist: aud.filter((a) => a.tabela === 'combos') }
  })
  const set = (k, num) => (e) => setEd({ ...ed, [k]: num ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value })

  async function salvar(e) {
    e.preventDefault()
    try {
      const c = { ...ed }
      if (!c.preco_promocional) { c.preco_promocional = null; c.promocao_ate = null }
      if (!c.promocao_ate) c.promocao_ate = null
      await api.salvarCombo(c); avisar('Combo salvo.'); setEd(null); recarregar()
    } catch (er) { avisar(er.message, 'erro') }
  }
  async function alternar(c) {
    try { await api.salvarCombo({ id: c.id, ativo: !c.ativo }); avisar(c.ativo ? 'Combo desativado.' : 'Combo reativado.'); recarregar() } catch (er) { avisar(er.message, 'erro') }
  }
  const aplicarDesconto = () => {
    const p = Number(desconto)
    if (p > 0 && p < 100) setEd({ ...ed, preco_promocional: Math.round(ed.preco * (100 - p)) / 100 })
  }

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><h1>Combos e preços</h1><p>Crie combos, altere preços, quantidades, validade e promoções sem depender de TI.</p></div>
        <button className="btn btn-primario" onClick={() => { setDesconto(''); setEd({ ...NOVO }) }}>+ Novo combo</button>
      </div>
      {carregando || !dados ? <Carregando /> : dados.combos.length === 0 ? <div className="cartao"><Vazio titulo="Nenhum combo cadastrado">Crie o primeiro combo para os dentistas comprarem.</Vazio></div> : (
        <div className="grade">
          {dados.combos.map((c) => {
            const atual = precoAtual(c, hoje())
            return (
              <div className="cartao combo" key={c.id} style={c.ativo ? null : { opacity: .6 }}>
                <div className="linha-entre"><h3 style={{ margin: 0 }}>{c.nome}</h3><Selo cor={c.ativo ? 'verde' : 'cinza'}>{c.ativo ? 'Ativo' : 'Desativado'}</Selo></div>
                <div className="combo-preco">{atual < c.preco && <s>{moeda(c.preco)}</s>}{moeda(atual)}</div>
                <div className="suave pequeno">{plural(c.qtd_creditos, 'escaneamento', 'escaneamentos')} · validade {c.validade_dias} dias · {MODALIDADE[c.modalidade]}</div>
                {c.preco_promocional != null && <div className="pequeno"><Selo cor="amarelo">Promoção {moeda(c.preco_promocional)}{c.promocao_ate ? ` até ${dataYmdBR(c.promocao_ate)}` : ''}</Selo></div>}
                {c.descricao && <div className="pequeno">{c.descricao}</div>}
                <div className="linha mt">
                  <button className="btn btn-pequeno" onClick={() => { setDesconto(''); setEd({ ...c }) }}>Editar</button>
                  <button className="btn btn-pequeno" onClick={() => alternar(c)}>{c.ativo ? 'Desativar' : 'Reativar'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {dados && (
        <div className="cartao">
          <h2>Histórico de alterações comerciais</h2>
          {dados.hist.length === 0 ? <Vazio titulo="Sem alterações registradas" /> : (
            <div className="tabela-caixa">
              <table>
                <thead><tr><th>Quando</th><th>Combo</th><th>Ação</th><th>Mudança</th></tr></thead>
                <tbody>
                  {dados.hist.slice(0, 50).map((h) => {
                    const nome = h.depois?.nome || h.antes?.nome || dados.combos.find((c) => c.id === h.registro_id)?.nome || '—'
                    const mud = h.antes && h.depois
                      ? ['preco', 'preco_promocional', 'qtd_creditos', 'validade_dias', 'ativo', 'modalidade'].filter((k) => k in h.depois && String(h.antes[k]) !== String(h.depois[k]))
                        .map((k) => `${k.replace('_', ' ')}: ${h.antes[k] ?? '—'} → ${h.depois[k] ?? '—'}`).join(' · ')
                      : h.acao === 'INSERT' ? 'Criado' : ''
                    return <tr key={h.id}><td>{dataHoraCurta(h.em)}</td><td>{nome}</td><td>{h.acao === 'INSERT' ? 'Criação' : h.acao === 'UPDATE' ? 'Alteração' : 'Exclusão'}</td><td className="pequeno">{mud || '—'}</td></tr>
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal titulo={ed?.id ? 'Editar combo' : 'Novo combo'} aberto={!!ed} fechar={() => setEd(null)} largura={680}>
        {ed && (
          <form className="pilha" onSubmit={salvar}>
            <div className="form">
              <Campo rotulo="Nome do combo *" largo><input required value={ed.nome} onChange={set('nome')} /></Campo>
              <Campo rotulo="Descrição dos serviços incluídos" largo><textarea value={ed.descricao || ''} onChange={set('descricao')} /></Campo>
              <Campo rotulo="Qtd. de escaneamentos *"><input type="number" min={1} required value={ed.qtd_creditos} onChange={set('qtd_creditos', true)} /></Campo>
              <Campo rotulo="Valor de venda (R$) *"><input type="number" min={0} step="0.01" required value={ed.preco} onChange={set('preco', true)} /></Campo>
              <Campo rotulo="Validade dos créditos (dias) *"><input type="number" min={1} required value={ed.validade_dias} onChange={set('validade_dias', true)} /></Campo>
              <Campo rotulo="Modalidade de atendimento">
                <select value={ed.modalidade} onChange={set('modalidade')}>
                  <option value="ambos">Sede ou externo</option><option value="sede">Somente na sede</option><option value="externo">Somente externo</option>
                </select>
              </Campo>
              <Campo rotulo="Condições de utilização" largo><textarea value={ed.condicoes || ''} onChange={set('condicoes')} /></Campo>
            </div>
            <div className="cartao pilha" style={{ boxShadow: 'none', background: 'var(--fundo)' }}>
              <strong>Promoção / desconto</strong>
              <div className="form">
                <Campo rotulo="Aplicar desconto (%)">
                  <div className="linha" style={{ flexWrap: 'nowrap' }}>
                    <input type="number" min={1} max={99} value={desconto} onChange={(e) => setDesconto(e.target.value)} />
                    <button type="button" className="btn btn-pequeno" onClick={aplicarDesconto}>Aplicar</button>
                  </div>
                </Campo>
                <Campo rotulo="Preço promocional (R$)" dica="Vazio = sem promoção"><input type="number" min={0} step="0.01" value={ed.preco_promocional ?? ''} onChange={set('preco_promocional', true)} /></Campo>
                <Campo rotulo="Promoção válida até" dica="Vazio = sem data final"><input type="date" value={ed.promocao_ate || ''} onChange={set('promocao_ate')} /></Campo>
              </div>
            </div>
            <label className="check"><input type="checkbox" checked={ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} /> Combo ativo (visível para compra)</label>
            <div className="linha" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setEd(null)}>Cancelar</button>
              <button className="btn btn-primario">Salvar combo</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
