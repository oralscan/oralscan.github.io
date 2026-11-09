import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { Campo, Carregando, Selo, useAviso, useDados } from '../../components/ui.jsx'
import { DIAS } from '../../lib/tempo.js'
import { mascaraFone } from '../../lib/util.js'

export default function Configuracoes() {
  const avisar = useAviso()
  const { dados, carregando, recarregar } = useDados(async () => {
    const [config, servicos, regioes] = await Promise.all([api.config(), api.servicos(), api.regioes()])
    return { config, servicos, regioes }
  })
  const [cfg, setCfg] = useState(null)
  useEffect(() => { if (dados) setCfg(structuredClone(dados.config)) }, [dados])
  if (carregando || !dados || !cfg) return <Carregando />

  const num = (k) => (e) => setCfg({ ...cfg, [k]: Number(e.target.value) })
  const txt = (k) => (e) => setCfg({ ...cfg, [k]: e.target.value })
  const janelas = (d) => cfg.horarios[d] || []
  const setJanelas = (d, l) => setCfg({ ...cfg, horarios: { ...cfg.horarios, [d]: l } })

  async function salvarConfig(e) {
    e?.preventDefault()
    const { id, ...resto } = cfg
    try { await api.salvarConfig(resto); avisar('Configurações salvas.'); recarregar() } catch (er) { avisar(er.message, 'erro') }
  }

  return (
    <div className="pilha">
      <div className="cabecalho"><div><h1>Configurações</h1><p>Regras da agenda, horários, serviços, regiões e dados da clínica.</p></div></div>

      <form className="cartao pilha" onSubmit={salvarConfig}>
        <h2>Regras da agenda</h2>
        <div className="form">
          <Campo rotulo="Antecedência mínima (horas)" dica="Dentistas só veem horários a partir deste prazo"><input type="number" min={0} value={cfg.antecedencia_horas} onChange={num('antecedencia_horas')} /></Campo>
          <Campo rotulo="Intervalo entre horários (min)" dica="Ex.: 30 = 08:00, 08:30, 09:00…"><input type="number" min={5} step={5} value={cfg.passo_min} onChange={num('passo_min')} /></Campo>
          <Campo rotulo="Intervalo após atendimento na sede (min)"><input type="number" min={0} value={cfg.intervalo_min} onChange={num('intervalo_min')} /></Campo>
          <Campo rotulo="Intervalo mínimo após atendimento externo (min)" dica="Atendimento + locomoção. Padrão 60."><input type="number" min={0} value={cfg.intervalo_externo_min} onChange={num('intervalo_externo_min')} /></Campo>
          <Campo rotulo="Cancelamento devolve crédito com (horas)" dica="Cancelando antes disso, o crédito volta"><input type="number" min={0} value={cfg.cancelamento_horas} onChange={num('cancelamento_horas')} /></Campo>
        </div>

        <h2 className="mt">Dias e horários de funcionamento</h2>
        <div className="pilha">
          {DIAS.map((nome, d) => (
            <div key={d} className="linha" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--borda)', paddingBottom: 10 }}>
              <strong style={{ width: 90, paddingTop: 10 }}>{nome}</strong>
              <div className="pilha cresce" style={{ gap: 6 }}>
                {janelas(d).length === 0 && <span className="suave" style={{ paddingTop: 10 }}>Fechado</span>}
                {janelas(d).map((j, i) => (
                  <div key={i} className="linha" style={{ flexWrap: 'nowrap' }}>
                    <input type="time" value={j.ini} style={{ maxWidth: 130 }} onChange={(e) => setJanelas(d, janelas(d).map((x, k) => k === i ? { ...x, ini: e.target.value } : x))} />
                    <span>às</span>
                    <input type="time" value={j.fim} style={{ maxWidth: 130 }} onChange={(e) => setJanelas(d, janelas(d).map((x, k) => k === i ? { ...x, fim: e.target.value } : x))} />
                    <button type="button" className="btn-icone" aria-label="Remover" onClick={() => setJanelas(d, janelas(d).filter((_, k) => k !== i))}>✕</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-pequeno" onClick={() => setJanelas(d, [...janelas(d), { ini: '08:00', fim: '12:00' }])}>+ Período</button>
            </div>
          ))}
        </div>

        <h2 className="mt">Dados da clínica</h2>
        <div className="form">
          <Campo rotulo="Endereço da sede (onde fica o scanner)" largo><input value={cfg.endereco_sede} onChange={txt('endereco_sede')} /></Campo>
          <Campo rotulo="WhatsApp da clínica" dica="Recebe confirmações e comprovantes"><input type="tel" inputMode="tel" value={mascaraFone(cfg.whatsapp_clinica)} onChange={(ev) => txt('whatsapp_clinica')({ target: { value: mascaraFone(ev.target.value) } })} placeholder="(14) 99999-9999" /></Campo>
          <Campo rotulo="Chave PIX (reserva)" dica="Usada só se o Mercado Pago não estiver ligado; aí você confirma o pagamento manualmente em Vendas."><input value={cfg.chave_pix} onChange={txt('chave_pix')} /></Campo>
          <Campo rotulo="Política de privacidade (opcional)" dica="Vazio = texto padrão LGPD do app" largo><textarea rows={5} value={cfg.politica_privacidade} onChange={txt('politica_privacidade')} /></Campo>
        </div>
        <div><button className="btn btn-primario">Salvar configurações</button></div>
      </form>

      <div className="grade-2">
        <Servicos servicos={dados.servicos} aoMudar={recarregar} />
        <Regioes regioes={dados.regioes} aoMudar={recarregar} />
      </div>
    </div>
  )
}

function Servicos({ servicos, aoMudar }) {
  const avisar = useAviso()
  const [lista, setLista] = useState(servicos)
  useEffect(() => setLista(servicos), [servicos])
  const alt = (i, k, v) => setLista(lista.map((s, j) => j === i ? { ...s, [k]: v, _mudou: true } : s))
  async function salvar(s) {
    const { _mudou, ...limpo } = s
    try { await api.salvarServico(limpo); avisar('Serviço salvo.'); aoMudar() } catch (er) { avisar(er.message, 'erro') }
  }
  return (
    <div className="cartao pilha">
      <div className="cartao-titulo">
        <h2>Tipos de escaneamento</h2>
        <button className="btn btn-pequeno" onClick={() => setLista([...lista, { nome: '', descricao: '', duracao_min: 30, ativo: true, ordem: lista.length + 1, _mudou: true }])}>+ Serviço</button>
      </div>
      {lista.map((s, i) => (
        <div key={s.id || 'novo' + i} className="pilha" style={{ gap: 8, borderBottom: '1px solid var(--borda)', paddingBottom: 12 }}>
          <div className="linha" style={{ flexWrap: 'nowrap' }}>
            <input value={s.nome} placeholder="Nome" onChange={(e) => alt(i, 'nome', e.target.value)} />
            <input type="number" min={5} step={5} value={s.duracao_min} style={{ maxWidth: 90 }} onChange={(e) => alt(i, 'duracao_min', Number(e.target.value))} aria-label="Duração em minutos" />
            <span className="suave pequeno">min</span>
          </div>
          <input value={s.descricao || ''} placeholder="Descrição" onChange={(e) => alt(i, 'descricao', e.target.value)} />
          <div className="linha-entre">
            <label className="check pequeno"><input type="checkbox" checked={s.ativo} onChange={(e) => alt(i, 'ativo', e.target.checked)} /> Ativo</label>
            {s._mudou ? <button className="btn btn-primario btn-pequeno" disabled={!s.nome.trim()} onClick={() => salvar(s)}>Salvar</button> : !s.ativo && <Selo>Inativo</Selo>}
          </div>
        </div>
      ))}
    </div>
  )
}

function Regioes({ regioes, aoMudar }) {
  const avisar = useAviso()
  const [nova, setNova] = useState({ nome: '', deslocamento_min: 30 })
  const ativas = regioes.filter((r) => r.ativo)
  async function salvar(r) {
    try { await api.salvarRegiao(r); avisar('Região salva.'); setNova({ nome: '', deslocamento_min: 30 }); aoMudar() } catch (er) { avisar(er.message, 'erro') }
  }
  async function remover(r) {
    if (!confirm(`Deixar de atender a região "${r.nome}"?`)) return
    try { await api.excluirRegiao(r.id); aoMudar() } catch (er) { avisar(er.message, 'erro') }
  }
  return (
    <div className="cartao pilha">
      <h2>Regiões do atendimento externo</h2>
      <p className="suave pequeno" style={{ margin: 0 }}>O dentista só pode pedir atendimento na clínica dele se estiver numa destas regiões. O tempo de deslocamento é reservado antes e depois do atendimento.</p>
      {ativas.length === 0 && <div className="alerta alerta-info pequeno">Sem regiões cadastradas, o atendimento externo fica indisponível.</div>}
      {ativas.map((r) => (
        <div key={r.id} className="linha-entre" style={{ borderBottom: '1px solid var(--borda)', paddingBottom: 8 }}>
          <span><strong>{r.nome}</strong> <span className="suave pequeno">· {r.deslocamento_min} min de deslocamento</span></span>
          <button className="btn btn-pequeno btn-perigo" onClick={() => remover(r)}>Remover</button>
        </div>
      ))}
      <div className="form">
        <Campo rotulo="Nova região (bairro/cidade)"><input value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} /></Campo>
        <Campo rotulo="Deslocamento (min)"><input type="number" min={0} value={nova.deslocamento_min} onChange={(e) => setNova({ ...nova, deslocamento_min: Number(e.target.value) })} /></Campo>
      </div>
      <div><button className="btn btn-pequeno" disabled={!nova.nome.trim()} onClick={() => salvar(nova)}>Adicionar região</button></div>
    </div>
  )
}
