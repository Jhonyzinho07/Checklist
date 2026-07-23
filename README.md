# Checklist - Teto Mercury (App local)

App local em Node.js para o preenchimento do checklist de produção **PSP_PROD_138 (Rev. 02) — Teto Mercury**.
O montador preenche o checklist na tela (computador, tablet ou celular na mesma rede), e ao finalizar
o app gera automaticamente um **PDF** com todas as respostas e salva na pasta `checklists_preenchidos/`.

## Requisitos

- Node.js 18 ou superior instalado no computador/servidor local.
  (Verifique com `node -v` no terminal. Se não tiver, baixe em https://nodejs.org)

## Instalação (só na primeira vez)

1. Extraia esta pasta em qualquer lugar do computador, por exemplo:
   `C:\Checklists\checklist-teto-mercury` (Windows) ou `~/checklist-teto-mercury` (Mac/Linux).
2. Abra o terminal (ou Prompt de Comando) dentro dessa pasta.
3. Rode:
   ```
   npm install
   ```
   Isso baixa as duas dependências do projeto (Express e PDFKit). É necessário ter internet
   apenas nesta etapa; depois disso o app funciona 100% offline.

## Como rodar

Dentro da pasta do projeto:

```
npm start
```

Você verá uma mensagem como:

```
✅ Checklist Teto Mercury rodando em: http://localhost:3000
📁 PDFs preenchidos serão salvos em: .../checklists_preenchidos
```

Abra esse endereço no navegador (`http://localhost:3000`).

## Uso

1. Preencha os campos de identificação (N° do Teto, OP, Responsável, Crachá).
2. Para cada item do checklist, toque em **SIM** ou **NÃO**.
   - Onde houver imagem de referência, ela aparece logo abaixo da pergunta.
   - Há um campo opcional "Nota do montador" em cada item, caso precise registrar algo.
3. Quando todos os itens estiverem respondidos, o botão **"Gerar PDF e Salvar"** é habilitado.
4. Ao clicar, o PDF é gerado e salvo automaticamente em `checklists_preenchidos/` no computador
   que está rodando o servidor. Um link para abrir o PDF aparece na tela.
5. Use o botão **"Histórico"** no topo para ver e reabrir checklists já gerados anteriormente.

## Onde ficam os PDFs

Todos os PDFs preenchidos ficam salvos localmente em:

```
checklist-teto-mercury/checklists_preenchidos/
```

Cada arquivo é nomeado como rigorosamente como `Teto_Mercury_<numero_do_teto>_<op>_<data-hora>.pdf`,garantindo que nada seja sobrescrito,cada preenchimento gera um arquivo novo.

## Personalizando o checklist

Toda a estrutura de seções, perguntas, imagens e observações vive em um único arquivo:
`checklist-data.js`. Para editar perguntas, adicionar itens novos ou trocar textos, basta editar
esse arquivo (não precisa mexer no HTML nem no servidor). As imagens de referência ficam em
`public/images/`.

## Estrutura do projeto

```
checklist-teto-mercury/
├── server.js               → servidor Express + geração de PDF (PDFKit)
├── checklist-data.js        → estrutura do checklist (seções, perguntas, imagens)
├── package.json
├── public/
│   ├── index.html            → tela do formulário
│   ├── style.css
│   ├── script.js
│   └── images/                → imagens de referência de cada item + logo
└── checklists_preenchidos/    → PDFs gerados (criado automaticamente)
```
