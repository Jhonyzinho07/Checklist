// checklist-data.js
// Fonte única de verdade para a estrutura do checklist.
// Usado pelo servidor (geração de PDF) e exposto ao front-end via /api/checklist-data

module.exports = {
  documento: {
    titulo: "Checklist - Teto Mercury",
    codigo: "PSP_PROD_138",
    revisao: "Rev: 02",
    codigoItem: "AXE98572",
    cliente: "John Deere",
    itReferencia: "IT_INJ_91.4",
  },

  // Campos de cabeçalho preenchidos pelo montador em cada execução
  camposCabecalho: [
    { id: "numeroTeto", label: "N° do Teto" },
    { id: "op", label: "OP" },
    { id: "responsavel", label: "Responsável pela inspeção" },
    { id: "cracha", label: "Crachá" },
  ],

  secoes: [
    {
      id: "s1",
      titulo: "1 · REALIZE UMA INSPEÇÃO VISUAL",
      itens: [
        {
          id: "1.1",
          pergunta: "Existe algum furo obstruído?",
          observacaoLivre: true,
        },
        {
          id: "1.2",
          pergunta: "Existe alguma falha de injeção?",
          observacaoLivre: true,
        },
      ],
    },
    {
      id: "s2",
      titulo: "2 · MONTAGEM LADO INTERNO ( POSIÇÃO 1 )",
      itens: [
        {
          id: "2.1",
          pergunta: "Colocou os 5 insertos M8 (MP01336) conforme a IT_INJ_91.4?",
          imagem: "diag_21.png",
          observacao: "Lacrar os Insertos M8 com o lápis Vermelho.",
        },
        {
          id: "2.2",
          pergunta: "Colocou os 3 insertos M8 (MP01336) com arruela (MP01405) conforme a IT_INJ_91.4?",
          imagem: "diag_22.png",
          observacao: "Lacrar os Insertos M8 com arruelas com lápis Branco.",
        },
        {
          id: "2.3",
          pergunta: "Colocou os 18 insertos M6 (MP01335) conforme a IT_INJ_91.4?",
          imagem: "diag_23.png",
          observacao: "Lacrar os Insertos M6 com o lápis Amarelo.",
        },
      ],
    },
    {
      id: "s3",
      titulo: "3 · MONTAGEM LADO EXTERNO ( POSIÇÃO 2 )",
      itens: [
        {
          id: "3.1",
          pergunta: "Colocou os 4 insertos M8 (MP01336) conforme a IT_INJ_91.4?",
          imagem: "diag_31.png",
          observacao: "Lacrar os Insertos M8 com lápis Vermelho.",
        },
        {
          id: "3.2",
          pergunta: "Colocou os 24 insertos M6 (MP01335) conforme a IT_INJ_91.4?",
          imagem: "diag_32.png",
          observacao: "Lacrar os Insertos M6 com o lápis Amarelo.",
        },
        {
          id: "3.3",
          pergunta: "Fez o furo de 5mm conforme a IT_INJ_91.4?",
          imagem: "diag_33.png",
          observacao: "Utilize o dispositivo de Furação (DP_INJ_188).",
        },
      ],
    },
    {
      id: "s4",
      titulo: "4 · COLAGEM DAS MANTAS NOS DUTOS",
      itens: [
        {
          id: "4.1",
          pergunta: "Colou a manta (MP01126) no duto (MP01342) conforme a IT_INJ_91.4?",
          imagem: "diag_41.png",
        },
        {
          id: "4.2",
          pergunta: "Colou a manta (MP01127) no duto (MP01343) conforme a IT_INJ_91.4?",
        },
      ],
    },
    {
      id: "s5",
      titulo: "5 · COLAGEM",
      itens: [
        {
          id: "5.1",
          pergunta: "Preparou e Colou o ADAPTER FROM (HXE158260) conforme a IT_INJ_91.4?",
          imagem: "diag_51.png",
        },
        {
          id: "5.2",
          pergunta: "Preparou e Colou as chapas (L201855) conforme a IT_INJ_91.4?",
          observacao: "Remova o excesso de cola, caso haja.",
        },
      ],
    },
    {
      id: "s6",
      titulo: "5 · MONTAGEM DOS DUTOS",
      itens: [
        {
          id: "5.1b",
          numeroExibido: "5.1",
          pergunta: "Colocou os 17 Parafusos (MP01128) com arruelas (MP01124) conforme a IT_INJ_91.4?",
          imagem: "diag_dutos.png",
          observacao:
            "Aplicação dos parafusos: 2,7 - 3,3 Nm. A aplicação desses parafusos deve ser sempre feita dentro dos parâmetros estabelecidos.",
        },
        {
          id: "5.2b",
          numeroExibido: "5.2",
          pergunta: "Colocou os 2 Parafusos (MP01123) com arruelas (MP01124) conforme a IT_INJ_91.4?",
          observacao:
            "Aplicação dos parafusos: 2,7 - 3,3 Nm. A aplicação desses parafusos deve ser sempre feita dentro dos parâmetros estabelecidos.",
        },
      ],
    },
    {
      id: "s7",
      titulo: "6 · MONTAGEM DO FILTRO",
      itens: [
        {
          id: "6.1",
          pergunta: "Montou a trava (MP01125) no filtro conforme a IT_INJ_91.4?",
          imagem: "diag_filtro.png",
        },
        {
          id: "6.2",
          pergunta: "Montou o filtro (HXE199622) no teto com a isomanta conforme a IT_INJ_91.4?",
        },
      ],
    },
    {
      id: "s8",
      titulo: "7 · EMBALAGEM",
      itens: [
        {
          id: "7.1",
          pergunta: "Colocou 4 Tetos na Embalagem Metálica conforme a IT_INJ_91.4?",
          imagem: "diag_embalagem.png",
          observacao: "Em caso de dúvidas, acione o setor de Processos.",
        },
      ],
    },
  ],
};
