const cpfInput = document.getElementById('funruralCpf');
const cnpjInput = document.getElementById('funruralCnpj');
let dadosNotas = [];

document.getElementById('btnLer').addEventListener('click', () => {
  const files = document.getElementById('xmlFiles').files;
  if (!files.length) {
    alert('Selecione pelo menos 1 arquivo XML.');
    return;
  }
  lerVariosXMLs(files);
});

// Atualiza valores da tabela ao alterar FunRural
cpfInput.addEventListener('input', atualizarTabelaFunrural);
cnpjInput.addEventListener('input', atualizarTabelaFunrural);

function lerVariosXMLs(fileList) {
  dadosNotas = [];
  let lidos = 0;
  for (const file of fileList) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const xml = e.target.result;
      dadosNotas.push(extrairDados(xml));
      lidos++;
      if (lidos === fileList.length) {
        montarTabela(dadosNotas);
      }
    };
    reader.readAsText(file);
  }
}

function extrairDados(xmlString) {
  xmlString = xmlString.replace(/xmlns="[^"]*"/g, '');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const infNFe = xmlDoc.querySelector("infNFe");
  const emit = xmlDoc.querySelector("emit");
  const dest = xmlDoc.querySelector("dest");
  const det = xmlDoc.querySelector("det");
  const total = xmlDoc.querySelector("total > ICMSTot");

  const t = (el, tag) => (el && el.querySelector(tag)) ? el.querySelector(tag).textContent : '';

  // Tipo 0 = Entrada, 1 = Saída (em NF-e, normalmente tpNF)
  const tipoNF = t(infNFe, 'tpNF') === '1' ? 'Saída' : 'Entrada';

  // CNPJ/CPF Destinatário: se não tem CNPJ, pega CPF (NFe produtor rural pode ser CPF)
  let destCnpjCpf = t(dest, 'CNPJ');
  if(!destCnpjCpf) destCnpjCpf = t(dest, 'CPF');

  // FunRural: verifica se destinatário é CPF ou CNPJ
  const tipoPessoaDest = destCnpjCpf.length === 11 ? 'cpf' : 'cnpj';

  return {
    chave: infNFe?.getAttribute('Id')?.replace('NFe', '') ?? '',
    numero: t(infNFe, 'nNF'),
    serie: t(infNFe, 'serie'),
    natureza: t(infNFe, 'natOp'),
    tipo: tipoNF,
    entradaSaida: t(infNFe, 'dhSaiEnt')?.replace('T', ' ').replace(/-\d{2}:\d{2}$/, '') ?? '',
    emitenteCNPJ: t(emit, 'CNPJ'),
    emitente: t(emit, 'xNome'),
    destinatarioCNPJ: destCnpjCpf,
    destinatario: t(dest, 'xNome'),
    totalOutrasDespesas: (total && t(total, 'vOutro')) ? Number(t(total, 'vOutro')) : 0,
    totalNFe: (total && t(total, 'vNF')) ? Number(t(total, 'vNF')) : 0,
    item: det?.getAttribute('nItem') ?? '',
    codigoProduto: t(det, 'cProd'),
    descProduto: t(det, 'xProd'),
    ncm: t(det, 'NCM'),
    cfop: t(det, 'CFOP'),
    qtd: t(det, 'qCom'),
    valorUnitario: (det && t(det, 'vUnCom')) ? Number(t(det, 'vUnCom')) : 0,
    valorProduto: (det && t(det, 'vProd')) ? Number(t(det, 'vProd')) : 0,
    tipoPessoaDest,
  };
}

function montarTabela(dados) {
  if (!dados.length) {
    document.getElementById('tableContainer').innerHTML = "";
    return;
  }

  const headers = [
    'Chave', 'Número', 'Série', 'Natureza da operação', 'Tipo', 'Entrada/Saída',
    'Emitente CNPJ/CPF', 'Emitente', 'Destinatário CNPJ/CPF', 'Destinatário',
    'Total Outras Despesas', 'Total NF-e', 'FunRural', 'Item', 'Código do produto',
    'Descrição do produto', 'NCM', 'CFOP', 'Qtd', 'Valor Unitário', 'Valor Produto'
  ];

  let html = '<table><thead><tr>';
  headers.forEach(h => html += `<th>${h}</th>`);
  html += '</tr></thead><tbody>';

  dados.forEach(linha => {
    const percFunRural = linha.tipoPessoaDest === 'cpf' 
      ? parseFloat(cpfInput.value.replace(',','.')) || 0
      : parseFloat(cnpjInput.value.replace(',','.')) || 0;

    const valorFunRural = ((linha.totalNFe || 0) * percFunRural / 100);

    html += '<tr>';
    html += `<td>${linha.chave}</td>`;
    html += `<td>${linha.numero}</td>`;
    html += `<td>${linha.serie}</td>`;
    html += `<td>${linha.natureza}</td>`;
    html += `<td>${linha.tipo}</td>`;
    html += `<td>${linha.entradaSaida}</td>`;
    html += `<td>${linha.emitenteCNPJ}</td>`;
    html += `<td>${linha.emitente}</td>`;
    html += `<td>${linha.destinatarioCNPJ}</td>`;
    html += `<td>${linha.destinatario}</td>`;
    html += `<td>R$ ${Number(linha.totalOutrasDespesas).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>`;
    html += `<td>R$ ${Number(linha.totalNFe).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>`;
    html += `<td>R$ ${valorFunRural.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>`;
    html += `<td>${linha.item}</td>`;
    html += `<td>${linha.codigoProduto}</td>`;
    html += `<td>${linha.descProduto}</td>`;
    html += `<td>${linha.ncm}</td>`;
    html += `<td>${linha.cfop}</td>`;
    html += `<td>${linha.qtd}</td>`;
    html += `<td>R$ ${Number(linha.valorUnitario).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>`;
    html += `<td>R$ ${Number(linha.valorProduto).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  document.getElementById('tableContainer').innerHTML = html;
}

function atualizarTabelaFunrural() {
  if (dadosNotas.length) montarTabela(dadosNotas);
}

//Exel
document.getElementById('btnExportarExcel').addEventListener('click', function () {
  exportTableToExcel('tableContainer', 'Leitao-XML-NFE');
});

function exportTableToExcel(tableContainerId, filename = '') {
  let table = document.getElementById(tableContainerId).querySelector('table');
  if (!table) {
    alert('Tabela não encontrada!');
    return;
  }
  // Pega o HTML puro da tabela, sem replace de espaço!
  let html = table.outerHTML;

  // Monta o arquivo para Excel (HTML "falso" mas o Excel lê tudo)
  let excelFile = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]><xml>
      <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>LeitaoXML</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
      </xml><![endif]-->
      <meta charset="UTF-8">
    </head>
    <body>${html}</body>
    </html>`;

  let blob = new Blob([excelFile], { type: 'application/vnd.ms-excel' });
  let url = URL.createObjectURL(blob);

  let a = document.createElement('a');
  a.href = url;
  a.download = (filename ? filename : 'tabela') + '.xls';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}
