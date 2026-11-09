// Exporta relatórios para Excel (.xlsx). Para PDF usamos a impressão do navegador
// ("Salvar como PDF"), que respeita o layout da tela.
export async function exportarExcel(nomeArquivo, abas) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const [nome, linhas] of Object.entries(abas)) {
    const ws = XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ '': 'Sem dados no período' }])
    const cols = Object.keys(linhas[0] || { '': '' })
    ws['!cols'] = cols.map((c) => ({ wch: Math.max(12, c.length + 2, ...linhas.slice(0, 200).map((l) => String(l[c] ?? '').length + 1)) }))
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31))
  }
  XLSX.writeFile(wb, nomeArquivo.endsWith('.xlsx') ? nomeArquivo : nomeArquivo + '.xlsx')
}

export const exportarPdf = () => window.print()
