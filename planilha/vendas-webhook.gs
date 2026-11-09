/**
 * ORAL SCAN – recebe as vendas do app (webhook do Supabase) e grava na planilha.
 *
 * Como instalar (na conta app.oralscan@gmail.com):
 * 1. script.google.com > Novo projeto > cole este arquivo.
 * 2. Troque TOKEN pelo mesmo valor gravado no Supabase (tabela integracoes)
 *    e PLANILHA_ID pelo ID da planilha "Oral Scan - Vendas".
 * 3. Implantar > Nova implantação > Tipo "App da Web"
 *    Executar como: Eu · Quem pode acessar: Qualquer pessoa > Implantar > autorizar.
 * 4. Copie a URL do app da Web (termina em /exec) e grave no Supabase.
 *
 * Cada compra ocupa UMA linha (identificada pelo ID da compra): quando o status
 * muda (pago, estornado, cancelado) a mesma linha é atualizada.
 */
const TOKEN = 'COLE_AQUI_O_TOKEN';
const PLANILHA_ID = 'COLE_AQUI_O_ID_DA_PLANILHA'; // parte da URL entre /d/ e /edit
const ABA = 'Vendas';
const COLUNAS = [
  'ID da compra', 'Data da compra', 'Pago em', 'Status', 'Comprador', 'E-mail', 'WhatsApp',
  'CRO', 'Clínica', 'CPF/CNPJ', 'Combo', 'Créditos', 'Valor (R$)', 'ID transação',
  'Forma', 'Atualizado em',
];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    if (d.token !== TOKEN) return resposta({ ok: false, erro: 'token inválido' });
    const aba = obterAba();
    const linha = [
      d.compra_id, data(d.criado_em), data(d.pago_em), traduz(d.status), d.nome, d.email, d.whatsapp,
      d.cro, d.clinica, d.cpf_cnpj, d.combo, Number(d.creditos || 0), Number(d.valor || 0),
      d.transacao_id || '', d.gateway === 'mercadopago' ? 'PIX Mercado Pago' : 'PIX manual',
      new Date(),
    ];
    const ids = aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues().flat() : [];
    const i = ids.indexOf(d.compra_id);
    if (i >= 0) aba.getRange(i + 2, 1, 1, linha.length).setValues([linha]);
    else aba.appendRow(linha);
    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  }
}

// Teste manual: rode esta função no editor para ver a aba sendo criada.
function testar() {
  doPost({ postData: { contents: JSON.stringify({
    token: TOKEN, compra_id: 'TESTE-123', criado_em: new Date().toISOString(), pago_em: new Date().toISOString(),
    status: 'pago', nome: 'Dentista Teste', email: 'teste@exemplo.com', combo: 'Combo Teste', creditos: 5, valor: 720,
  }) } });
}

function obterAba() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let aba = ss.getSheetByName(ABA);
  if (!aba) aba = ss.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    aba.appendRow(COLUNAS);
    aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold').setBackground('#14838f').setFontColor('#ffffff');
    aba.setFrozenRows(1);
    aba.getRange('B:C').setNumberFormat('dd/mm/yyyy hh:mm');
    aba.getRange('P:P').setNumberFormat('dd/mm/yyyy hh:mm');
    aba.getRange('M:M').setNumberFormat('R$ #,##0.00');
  }
  return aba;
}

function data(s) { return s ? new Date(s) : ''; }
function traduz(s) {
  return ({ pago: 'Pago', pendente: 'Pendente', estornado: 'Estornado', cancelado: 'Cancelado' })[s] || s;
}
function resposta(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
