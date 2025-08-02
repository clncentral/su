document.addEventListener("DOMContentLoaded", function() {
    const topicosDiv = document.getElementById("topicos");
    const colunas = []; // Array para armazenar as colunas criadas

    // Função para criar uma nova coluna
    function criarNovaColuna() {
        const novaColuna = document.createElement("div");
        novaColuna.classList.add("column"); // Adiciona a classe "column"
        topicosDiv.appendChild(novaColuna);
        colunas.push(novaColuna); // Adiciona a nova coluna ao array de colunas
        return novaColuna;
    }

    // Função para adicionar um novo tópico
    function adicionarTopico(titulo, link, data) {
        const dataTopico = new Date(data);
        const hoje = new Date();

        // Verifica se a data do tópico é maior que a data atual
        if (dataTopico > hoje) {
            return; // Não adiciona o tópico se a data for futura
        }

        // Verifica se é necessário criar uma nova coluna
        if (colunas.length === 0 || colunas[colunas.length - 1].children.length >= 10) {
            criarNovaColuna(); // Cria uma nova coluna
        }

        // Encontra a coluna com o menor número de tópicos
        let colunaMenosCheia = colunas.reduce((acumulador, coluna) => 
            (acumulador.children.length < coluna.children.length) ? acumulador : coluna);

        const novoTopico = document.createElement("div");
        novoTopico.classList.add("topico");
        const icone = document.createElement("span");

        // Define o símbolo do ícone com base na data do tópico
        const umaSemanaEmMillis = 4 * 24 * 60 * 60 * 1000;
        if (hoje - dataTopico <= umaSemanaEmMillis) {
            icone.textContent = "⇒"; // Símbolo para tópicos recentes
			novoTopico.classList.add("novo");
        } else {
            icone.textContent = "⇓"; // Símbolo para tópicos antigos
			novoTopico.classList.add("velho");
        }
        
        icone.style.marginRight = "5px"; // Espaçamento entre o ícone e o título
        novoTopico.appendChild(icone);
        const novoLink = document.createElement("a");
        novoLink.href = link;
        novoLink.textContent = titulo;
        novoLink.target = "_blank";
        novoTopico.appendChild(novoLink);

        colunaMenosCheia.appendChild(novoTopico); // Adiciona o tópico à coluna menos cheia
    }

    // Exemplo de adição de tópicos
	adicionarTopico("Consulta CNPJ", "hist/cnpj.html", "2024-05-09");
	adicionarTopico("Consulta CFOP", "https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Documents/Legislacao/Tabelas/CFOP.htm#Sa%C3%ADdas_Outros_Estados_5000", "2024-05-08");
    	adicionarTopico("Pesquisar PDF", "hist/pesq.html", "2024-05-09");
	adicionarTopico("XML Produtor Rural", "leitor/index.html", "01-08-2025");
	// Adicionar mais tópicos conforme necessário
});


