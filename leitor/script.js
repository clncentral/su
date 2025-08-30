// script.js — mantém seu visual, 1 item = 1 linha, FunRural por CPF/CNPJ, XLSX com formatos corretos
(() => {
  const fileInput     = document.getElementById('xmlFiles');
  const btnLer        = document.getElementById('btnLer');
  const btnExportar   = document.getElementById('btnExportarExcel');
  const tableContainer= document.getElementById('tableContainer');

  // FunRural (%)
  const cpfInput      = document.getElementById('funruralCpf');   // ex.: 1.50
  const cnpjInput     = document.getElementById('funruralCnpj');  // ex.: 2.05

  // Guarda as linhas “cruas” (números), para recalcular FunRural quando mudar a %.
  let linhasBase = [];   // cada item da NF = 1 objeto
  let dadosNotas = [];   // compatível com seu antigo (só para atualizar tabela ao mexer no %)

  const HEADERS = [
    'Chave','Número','Série','Natureza da operação','Tipo','Entrada/Saída',
    'Emitente CNPJ/CPF','Emitente','Destinatário CNPJ/CPF','Destinatário',
    'Total Outras Despesas','Total NF-e','FunRural',
    'Item','Código do produto','Descrição do produto','NCM','CFOP','Qtd','Valor Unitário','Valor Produto'
  ];

  // ===== Eventos =====
  btnLer?.addEventListener('click', async () => {
    const files = Array.from(fileInput?.files || []);
    if (!files.length) {
      alert('Selecione pelo menos 1 arquivo XML.');
      return;
    }
    await lerVariosXMLs(files);
  });

  // Atualiza valores da tabela ao alterar FunRural
  cpfInput?.addEventListener('input', atualizarTabelaFunrural);
  cnpjInput?.addEventListener('input', atualizarTabelaFunrural);

  // Exportar XLSX
  btnExportar?.addEventListener('click', () => {
    exportarXLSX();
  });

  // ===== Leitura múltipla de XML =====
  async function lerVariosXMLs(fileList) {
    linhasBase = [];
    dadosNotas = []; // compat
    let lidos = 0;

    for (const file of fileList) {
      if (!file.name.toLowerCase().endsWith('.xml')) continue;
      const xml = await file.text();
      const arr = extrairDadosTodosItens(xml);
      linhasBase.push(...arr);
      // para compat com seu antigo (usado no atualizarTabelaFunrural)
      dadosNotas.push(...arr.map(mapCompatAntigo));
      lidos++;
    }

    montarTabela(linhasBase);
    btnExportar.disabled = linhasBase.length === 0;
  }

  // ===== Extrai TODOS os <det> como linhas =====
  function extrairDadosTodosItens(xmlString) {
    // remove namespace padrão para simplificar seletores
    xmlString = xmlString.replace(/xmlns="[^"]*"/g, '');
    const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');

    const infNFe = xmlDoc.querySelector('infNFe');
    if (!infNFe) return [];

    const emit   = xmlDoc.querySelector('emit');
    const dest   = xmlDoc.querySelector('dest');
    const total  = xmlDoc.querySelector('total > ICMSTot');
    const dets   = Array.from(xmlDoc.querySelectorAll('det'));

    const t = (el, tag) => (el && el.querySelector(tag)) ? el.querySelector(tag).textContent.trim() : '';
    const toNum = (v) => {
      if (!v) return 0;
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : 0;
    };

    const chave      = infNFe?.getAttribute('Id')?.replace('NFe','') ?? '';
    const numero     = t(infNFe, 'nNF');
    const serie      = t(infNFe, 'serie');
    const natureza   = t(infNFe, 'natOp');
    const tipoNF     = t(infNFe, 'tpNF') === '1' ? 'Saída' : 'Entrada';
    const entradaSaida = (t(infNFe, 'dhSaiEnt') || '').replace('T',' ').replace(/-\d{2}:\d{2}$/, '');

    const emitenteCNPJ = t(emit,'CNPJ') || t(emit,'CPF');
    const emitente     = t(emit,'xNome');
    const destCnpjCpf  = t(dest,'CNPJ') || t(dest,'CPF');
    const destinatario = t(dest,'xNome');

    const totalOutrasDespesas = toNum(t(total,'vOutro'));
    const totalNFe            = toNum(t(total,'vNF'));

    // tipo pessoa do destinatário (para decidir % FunRural)
    const tipoPessoaDest = (destCnpjCpf && destCnpjCpf.length === 11) ? 'cpf' : 'cnpj';

    // Para cada item det
    const linhas = dets.map(det => {
      const item      = det?.getAttribute('nItem') ?? '';
      const codigo    = t(det,'cProd');
      const desc      = t(det,'xProd');
      const ncm       = t(det,'NCM');
      const cfop      = t(det,'CFOP');
      const qtd       = toNum(t(det,'qCom') || t(det,'qTrib'));
      const vlrUnit   = toNum(t(det,'vUnCom') || t(det,'vUnTrib'));
      const vlrProd   = toNum(t(det,'vProd'));

      return {
        // cabeçalho da nota
        chave, numero, serie, natureza, tipo: tipoNF, entradaSaida,
        emitenteCNPJ, emitente, destinatarioCNPJ: destCnpjCpf, destinatario,
        totalOutrasDespesas, totalNFe,
        // item
        item, codigoProduto: codigo, descProduto: desc, ncm, cfop, qtd, valorUnitario: vlrUnit, valorProduto: vlrProd,
        // para FunRural
        tipoPessoaDest
      };
    });

    return linhas;
  }

  // Mapeia p/ shape “antigo” só p/ reaproveitar a função de montar (compat)
  function mapCompatAntigo(l) {
    return {
      chave: l.chave,
      numero: l.numero,
      serie: l.serie,
      natureza: l.natureza,
      tipo: l.tipo,
      entradaSaida: l.entradaSaida,
      emitenteCNPJ: l.emitenteCNPJ,
      emitente: l.emitente,
      destinatarioCNPJ: l.destinatarioCNPJ,
      destinatario: l.destinatario,
      totalOutrasDespesas: l.totalOutrasDespesas,
      totalNFe: l.totalNFe,
      item: l.item,
      codigoProduto: l.codigoProduto,
      descProduto: l.descProduto,
      ncm: l.ncm,
      cfop: l.cfop,
      qtd: l.qtd,
      valorUnitario: l.valorUnitario,
      valorProduto: l.valorProduto,
      tipoPessoaDest: l.tipoPessoaDest
    };
  }

  // ===== Monta Tabela (com FunRural recalculado pela % atual) =====
  function montarTabela(dados) {
    if (!dados.length) {
      tableContainer.innerHTML = '';
      return;
    }

    const html = [];
    html.push('<table><thead><tr>');
    HEADERS.forEach(h => html.push(`<th>${h}</th>`));
    html.push('</tr></thead><tbody>');

    for (const linha of dados) {
      const percFunRural = (linha.tipoPessoaDest === 'cpf'
         ? parseFloat((cpfInput?.value || '0').replace(',','.')) || 0
         : parseFloat((cnpjInput?.value || '0').replace(',','.')) || 0);

      // 💡 Critério: FunRural calculado SOBRE O VALOR DO ITEM (valorProduto)
      // Se você quiser sobre o total da NF (mesmo repetindo por item), troque valorBase = linha.totalNFe;
      const valorBase   = Number(linha.valorProduto) || 0;
      const valorFunRural = valorBase * (percFunRural / 100);

      html.push('<tr>');
      html.push(`<td>${linha.chave}</td>`);
      html.push(`<td>${linha.numero}</td>`);
      html.push(`<td>${linha.serie}</td>`);
      html.push(`<td>${linha.natureza}</td>`);
      html.push(`<td>${linha.tipo}</td>`);
      html.push(`<td>${linha.entradaSaida}</td>`);
      html.push(`<td>${linha.emitenteCNPJ}</td>`);
      html.push(`<td>${linha.emitente}</td>`);
      html.push(`<td>${linha.destinatarioCNPJ}</td>`);
      html.push(`<td>${linha.destinatario}</td>`);
      html.push(`<td>${fmtBR(linha.totalOutrasDespesas)}</td>`);
      html.push(`<td>${fmtBR(linha.totalNFe)}</td>`);
      html.push(`<td>${fmtBR(valorFunRural)}</td>`);
      html.push(`<td>${linha.item}</td>`);
      html.push(`<td>${linha.codigoProduto}</td>`);
      html.push(`<td>${linha.descProduto}</td>`);
      html.push(`<td>${linha.ncm}</td>`);
      html.push(`<td>${linha.cfop}</td>`);
      html.push(`<td>${fmtBR(linha.qtd)}</td>`);
      html.push(`<td>${fmtBR(linha.valorUnitario)}</td>`);
      html.push(`<td>${fmtBR(linha.valorProduto)}</td>`);
      html.push('</tr>');
    }

    html.push('</tbody></table>');
    tableContainer.innerHTML = html.join('');
  }

  // ===== Recalcula tabela quando muda % FunRural =====
  function atualizarTabelaFunrural() {
    if (linhasBase.length) montarTabela(linhasBase);
  }

  // ===== XLSX (.xlsx de verdade) =====
  function exportarXLSX() {
    if (!window.XLSX) {
      alert('Biblioteca XLSX não carregada.');
      return;
    }
    const rows = linhasBase;
    if (!rows.length) {
      alert('Nada para exportar.');
      return;
    }

    // Monta linhas já com FunRural recalculado no momento da exportação
    const aoa = [HEADERS];
    for (const linha of rows) {
      const percFunRural = (linha.tipoPessoaDest === 'cpf'
        ? parseFloat((cpfInput?.value || '0').replace(',','.')) || 0
        : parseFloat((cnpjInput?.value || '0').replace(',','.')) || 0);
      const valorBase   = Number(linha.valorProduto) || 0; // ← troca para linha.totalNFe se quiser por NF
      const valorFunRural = valorBase * (percFunRural / 100);

      aoa.push([
        linha.chave, linha.numero, linha.serie, linha.natureza, linha.tipo, linha.entradaSaida,
        linha.emitenteCNPJ, linha.emitente, linha.destinatarioCNPJ, linha.destinatario,
        Number(linha.totalOutrasDespesas), Number(linha.totalNFe), Number(valorFunRural),
        linha.item, linha.codigoProduto, linha.descProduto, linha.ncm, linha.cfop,
        Number(linha.qtd), Number(linha.valorUnitario), Number(linha.valorProduto)
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Força TEXTO nas colunas sensíveis
    const textoCols = new Set([
      HEADERS.indexOf('Chave'),
      HEADERS.indexOf('Emitente CNPJ/CPF'),
      HEADERS.indexOf('Destinatário CNPJ/CPF'),
      HEADERS.indexOf('Código do produto')
    ]);

    // Define formatos numéricos (Excel mostra 0.000,00 em pt-BR)
    const moedaCols = new Set([
      HEADERS.indexOf('Total Outras Despesas'),
      HEADERS.indexOf('Total NF-e'),
      HEADERS.indexOf('FunRural'),
      HEADERS.indexOf('Valor Unitário'),
      HEADERS.indexOf('Valor Produto')
    ]);
    const qtdCol = HEADERS.indexOf('Qtd');

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; R++) { // ignora cabeçalho
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;

        if (textoCols.has(C)) {
          cell.t = 's';
          cell.v = String(cell.v ?? '');
          cell.z = '@';
        } else if (moedaCols.has(C)) {
          // número com 2 casas — Excel BR renderiza como 0.000,00
          cell.t = 'n';
          cell.v = Number(cell.v || 0);
          cell.z = '#,##0.00';
        } else if (C === qtdCol) {
          cell.t = 'n';
          cell.v = Number(cell.v || 0);
          cell.z = '#,##0.########'; // quantidade com mais casas se precisar
        }
      }
    }

    // Larguras amigáveis no Excel (não afeta sua tabela HTML)
    ws['!cols'] = HEADERS.map(h => {
      const base = ({
        'Chave': 36,
        'Natureza da operação': 26,
        'Emitente': 28,
        'Destinatário': 28,
        'Descrição do produto': 42,
        'Emissão': 19
      })[h] || 14;
      return { wch: base };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leitao-XML-NFE');
    XLSX.writeFile(wb, `Leitao-XML-NFE_${stamp()}.xlsx`, { compression: true });
  }

  // ===== Utils =====
  function fmtBR(n) {
    const v = Number(n || 0);
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function stamp() {
    const d = new Date(), p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  }
})();
