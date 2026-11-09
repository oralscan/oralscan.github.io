import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { api } from '../../lib/api.js'
import { useSessao } from '../../App.jsx'
import { Carregando, Selo, useAviso } from '../../components/ui.jsx'
import { moeda } from '../../lib/tempo.js'
import { linkWhats, STATUS_COMPRA } from '../../lib/util.js'
import { pixEstatico } from '../../lib/pix.js'

export default function Pagamento() {
  const { id } = useParams()
  const { perfil } = useSessao()
  const avisar = useAviso()
  const [compra, setCompra] = useState(null)
  const [config, setConfig] = useState(null)
  const [pix, setPix] = useState(null) // { copia, imagem, manual }
  const [erro, setErro] = useState('')
  const gerado = useRef(false)

  useEffect(() => {
    let vivo = true
    async function iniciar() {
      try {
        const [c, cfg] = await Promise.all([api.compra(id), api.config()])
        if (!vivo) return
        setCompra(c); setConfig(cfg)
        if (c.status !== 'pendente' || gerado.current) return
        gerado.current = true
        let atual = c
        if (!c.pix_copia_cola) {
          const r = await api.gerarPix(c.id)
          if (r?.compra) atual = r.compra
        }
        if (atual.pix_copia_cola) {
          const imagem = atual.pix_qr_base64 ? `data:image/png;base64,${atual.pix_qr_base64}` : await QRCode.toDataURL(atual.pix_copia_cola, { margin: 1, width: 440 })
          setPix({ copia: atual.pix_copia_cola, imagem, manual: false })
        } else if (cfg.chave_pix) {
          const copia = pixEstatico({ chave: cfg.chave_pix, valor: c.valor, txid: 'OS' + c.id.replace(/-/g, '').slice(0, 20) })
          setPix({ copia, imagem: await QRCode.toDataURL(copia, { margin: 1, width: 440 }), manual: true })
        } else {
          setErro('O pagamento por PIX ainda não foi configurado pela clínica. Fale com ela pelo WhatsApp.')
        }
      } catch (e) { setErro(e.message) }
    }
    iniciar()
    return () => { vivo = false }
  }, [id])

  // acompanha a confirmação do pagamento
  useEffect(() => {
    if (!compra || compra.status !== 'pendente') return
    const t = setInterval(async () => {
      try {
        const c = await api.compra(id)
        if (c.status !== 'pendente') { setCompra(c); if (c.status === 'pago') avisar('Pagamento confirmado! Créditos liberados.') }
      } catch { /* tenta de novo */ }
    }, 5000)
    return () => clearInterval(t)
  }, [compra, id, avisar])

  if (erro && !compra) return <div className="alerta alerta-erro">{erro}</div>
  if (!compra) return <Carregando />

  if (compra.status === 'pago') {
    return (
      <div className="cartao centro pilha" style={{ alignItems: 'center' }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <h1>Pagamento confirmado</h1>
        <p className="suave">{compra.qtd_creditos} crédito(s) do <strong>{compra.combo_nome}</strong> já estão na sua conta.</p>
        <Link className="btn btn-primario" to="/agendar">Agendar agora</Link>
      </div>
    )
  }
  if (compra.status !== 'pendente') {
    return (
      <div className="cartao centro">
        <h2>Compra {STATUS_COMPRA[compra.status].rotulo.toLowerCase()}</h2>
        <Link className="btn" to="/combos">Voltar aos combos</Link>
      </div>
    )
  }

  const textoWhats = `Olá! Fiz o PIX de ${moeda(compra.valor)} referente ao ${compra.combo_nome} no app Oral Scan (compra ${compra.id.slice(0, 8)}). Segue o comprovante. — ${perfil?.nome}`

  return (
    <div className="cartao pilha" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="linha-entre">
        <h1 style={{ margin: 0 }}>Pagamento PIX</h1>
        <Selo cor="amarelo">Aguardando pagamento</Selo>
      </div>
      <dl className="resumo">
        <dt>Combo</dt><dd>{compra.combo_nome}</dd>
        <dt>Créditos</dt><dd>{compra.qtd_creditos}</dd>
        <dt>Valor</dt><dd style={{ fontSize: '1.2rem' }}>{moeda(compra.valor)}</dd>
      </dl>
      {erro && <div className="alerta alerta-erro">{erro}</div>}
      {!pix && !erro && <Carregando texto="Gerando QR Code…" />}
      {pix && (
        <>
          <img className="pix-qr" src={pix.imagem} alt="QR Code PIX" />
          <div className="copia-cola">{pix.copia}</div>
          <button className="btn btn-primario" onClick={() => { navigator.clipboard?.writeText(pix.copia); avisar('Código PIX copiado.') }}>Copiar código PIX</button>
          {pix.manual ? (
            <div className="alerta alerta-aviso pequeno">
              Após pagar, envie o comprovante para a clínica. Os créditos serão liberados assim que o pagamento for conferido.
              {config?.whatsapp_clinica && <div className="mt" style={{ marginTop: 10 }}><a className="btn btn-whats btn-pequeno" href={linkWhats(config.whatsapp_clinica, textoWhats)} target="_blank" rel="noopener">Enviar comprovante</a></div>}
            </div>
          ) : (
            <div className="alerta alerta-info pequeno centro"><span className="giro" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />Aguardando a confirmação do banco. Esta tela atualiza sozinha.</div>
          )}
          {api.demo && (
            <button className="btn" onClick={async () => { await api.simularPagamento(compra.id); setCompra(await api.compra(compra.id)); avisar('Pagamento confirmado! Créditos liberados.') }}>
              (Demo) Simular confirmação do banco
            </button>
          )}
        </>
      )}
      <Link to="/combos" className="pequeno centro">Voltar aos combos</Link>
    </div>
  )
}
