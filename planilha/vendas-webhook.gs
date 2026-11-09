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
 *
 * Aba "Dentistas" (captação de leads): cada dentista que se cadastra no app ocupa
 * uma linha, atualizada sempre que o cadastro muda (mensagens com tipo = "dentista").
 */
const TOKEN = 'COLE_AQUI_O_TOKEN';
const PLANILHA_ID = 'COLE_AQUI_O_ID_DA_PLANILHA'; // parte da URL entre /d/ e /edit
const ABA = 'Vendas';
const COLUNAS = [
  'ID da compra', 'Data da compra', 'Pago em', 'Status', 'Comprador', 'E-mail', 'WhatsApp',
  'CRO', 'Clínica', 'CPF/CNPJ', 'Combo', 'Créditos', 'Valor (R$)', 'ID transação',
  'Forma', 'Atualizado em',
];

const ABA_DENTISTAS = 'Dentistas';
const COLUNAS_DENTISTAS = [
  'ID', 'Cadastrado em', 'Nome', 'E-mail', 'WhatsApp', 'Abrir conversa', 'Telefone', 'CRO',
  'CPF/CNPJ', 'Clínica', 'Endereço', 'Bairro', 'Cidade', 'CEP', 'Situação', 'Perfil',
  'Aceita ofertas', 'Autorização em', 'Aceite LGPD', 'Atualizado em',
];

function doPost(e) {
  // uma mensagem por vez: evita linhas duplicadas e abas criadas em dobro
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    return processar(e);
  } finally {
    trava.releaseLock();
  }
}

function processar(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    if (d.token !== TOKEN) return resposta({ ok: false, erro: 'token inválido' });
    if (d.tipo === 'dentista') return gravarDentista(d);
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

function gravarDentista(d) {
  const aba = obterAbaDentistas();
  const digitos = so(d.whatsapp);
  const linha = [
    d.id, data(d.criado_em), d.nome || '', d.email || '', fone(d.whatsapp), '', fone(d.telefone),
    d.cro ? d.cro + '/' + (d.cro_uf || '') : '', doc(d.cpf_cnpj), d.clinica || '', d.endereco || '',
    d.bairro || '', d.cidade || '', so(d.cep) ? molde(so(d.cep), '00000-000') : '', d.ativo === false ? 'Inativo' : 'Ativo',
    d.papel === 'admin' ? 'Admin' : 'Dentista',
    d.aceita_contato === true ? 'Sim' : 'Não', data(d.aceita_contato_em),
    data(d.consentimento_lgpd), new Date(),
  ];
  const ids = aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues().flat() : [];
  const i = ids.indexOf(d.id);
  const n = i >= 0 ? i + 2 : aba.getLastRow() + 1;
  aba.getRange(n, 1, 1, linha.length).setValues([linha]);
  // link clicável (não usa fórmula, então funciona em qualquer idioma da planilha)
  const celula = aba.getRange(n, 6);
  if (digitos) {
    const url = 'https://wa.me/' + (digitos.length <= 11 ? '55' + digitos : digitos);
    celula.setRichTextValue(SpreadsheetApp.newRichTextValue().setText('Abrir conversa').setLinkUrl(url).build());
  } else {
    celula.clearContent();
  }
  return resposta({ ok: true });
}

// mesma pontuação do app, para cadastros antigos salvos só com números
function so(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function molde(dig, m) { let i = 0, s = ''; for (const ch of m) { if (i >= dig.length) break; s += ch === '0' ? dig[i++] : ch; } return s; }
function fone(v) {
  let d = so(v);
  if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2);
  if (!d) return '';
  return d.length <= 10 ? molde(d, '(00) 0000-0000') : molde(d, '(00) 00000-0000');
}
function doc(v) {
  const d = so(v);
  if (!d) return '';
  return d.length <= 11 ? molde(d, '000.000.000-00') : molde(d, '00.000.000/0000-00');
}

function obterAbaDentistas() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let aba = ss.getSheetByName(ABA_DENTISTAS);
  if (!aba) aba = ss.insertSheet(ABA_DENTISTAS);
  // cabeçalho sempre igual à lista de colunas (assim colunas novas aparecem sozinhas)
  const cab = aba.getRange(1, 1, 1, COLUNAS_DENTISTAS.length);
  if (cab.getValues()[0].join('|') !== COLUNAS_DENTISTAS.join('|')) {
    cab.setValues([COLUNAS_DENTISTAS]).setFontWeight('bold').setBackground('#b97f72').setFontColor('#ffffff');
    aba.setFrozenRows(1);
    aba.getRange('B:B').setNumberFormat('dd/mm/yyyy hh:mm');
    aba.getRange('R:T').setNumberFormat('dd/mm/yyyy hh:mm');
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
