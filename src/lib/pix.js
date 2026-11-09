// Gera o "PIX copia e cola" (BR Code estático) a partir da chave PIX da clínica.
// Usado apenas quando o Mercado Pago ainda não está configurado: nesse caso
// a liberação dos créditos é feita pelo administrador após conferir o extrato.
const campo = (id, valor) => id + String(valor.length).padStart(2, '0') + valor

function crc16(str) {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    crc &= 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

const limpa = (s, max) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, max) || 'X'

export function pixEstatico({ chave, valor, nome = 'ORAL SCAN', cidade = 'SAO PAULO', txid = '***' }) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave.trim())
  let p = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986')
  if (valor) p += campo('54', Number(valor).toFixed(2))
  p += campo('58', 'BR') + campo('59', limpa(nome, 25)) + campo('60', limpa(cidade, 15))
  p += campo('62', campo('05', txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'))
  p += '6304'
  return p + crc16(p)
}
