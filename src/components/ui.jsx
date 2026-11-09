import { useEffect, useState, createContext, useContext, useCallback } from 'react'

export function Logo({ tamanho = 40 }) {
  return <img src="./icon.svg" alt="Oral Scan" width={tamanho} height={tamanho} style={{ display: 'block' }} />
}

export function Marca({ sub = true }) {
  return (
    <div className="marca">
      <Logo tamanho={38} />
      <div>
        <div className="marca-nome">ORAL SCAN</div>
        {sub && <div className="marca-sub">Dra. Tamires Bueno</div>}
      </div>
    </div>
  )
}

export const Selo = ({ cor = 'cinza', children }) => <span className={`selo selo-${cor}`}>{children}</span>

export function Carregando({ texto = 'Carregando…' }) {
  return <div className="carregando"><span className="giro" />{texto}</div>
}

export function Vazio({ titulo, children }) {
  return <div className="vazio"><strong>{titulo}</strong>{children && <div>{children}</div>}</div>
}

export function Modal({ titulo, aberto, fechar, children, largura = 520 }) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, fechar])
  if (!aberto) return null
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal" style={{ maxWidth: largura }} role="dialog" aria-label={titulo}>
        <div className="modal-topo">
          <h3>{titulo}</h3>
          <button className="btn-icone" onClick={fechar} aria-label="Fechar">✕</button>
        </div>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>
  )
}

export function Campo({ rotulo, dica, children, largo }) {
  return (
    <label className={`campo ${largo ? 'campo-largo' : ''}`}>
      <span className="campo-rotulo">{rotulo}</span>
      {children}
      {dica && <span className="campo-dica">{dica}</span>}
    </label>
  )
}

/** Campo de senha com botão para mostrar/ocultar o que foi digitado. */
export function CampoSenha({ rotulo = 'Senha', dica, value, onChange, autoComplete = 'current-password', minLength, required = true }) {
  const [ver, setVer] = useState(false)
  return (
    <Campo rotulo={rotulo} dica={dica}>
      <div className="senha">
        <input
          type={ver ? 'text' : 'password'} autoComplete={autoComplete} required={required} minLength={minLength}
          value={value} onChange={onChange} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        />
        <button
          type="button" className="senha-olho" onClick={() => setVer((v) => !v)}
          aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={ver} title={ver ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {ver && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
    </Campo>
  )
}

export function Kpi({ rotulo, valor, detalhe, destaque }) {
  return (
    <div className={`kpi ${destaque ? 'kpi-destaque' : ''}`}>
      <div className="kpi-rotulo">{rotulo}</div>
      <div className="kpi-valor">{valor}</div>
      {detalhe && <div className="kpi-detalhe">{detalhe}</div>}
    </div>
  )
}

// ---------- avisos (toast) ----------
const AvisoCtx = createContext(() => {})
export const useAviso = () => useContext(AvisoCtx)
export function AvisoProvider({ children }) {
  const [lista, setLista] = useState([])
  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random()
    setLista((l) => [...l, { id, texto, tipo }])
    setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), tipo === 'erro' ? 6000 : 3500)
  }, [])
  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      <div className="avisos" role="status">
        {lista.map((a) => <div key={a.id} className={`aviso aviso-${a.tipo}`}>{a.texto}</div>)}
      </div>
    </AvisoCtx.Provider>
  )
}

// carrega dados assíncronos com recarga manual
export function useDados(fn, deps = []) {
  const [estado, setEstado] = useState({ dados: null, erro: null, carregando: true })
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, carregando: true }))
    Promise.resolve(fn())
      .then((dados) => vivo && setEstado({ dados, erro: null, carregando: false }))
      .catch((erro) => vivo && setEstado({ dados: null, erro, carregando: false }))
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao])
  return { ...estado, recarregar: () => setVersao((v) => v + 1) }
}
