# Checklist - Teto Mercury (App local)

App local em Node.js para o preenchimento do checklist de produção **PSP_PROD_138 (Rev. 02) — Teto Mercury**.
O montador preenche o checklist na tela (computador, tablet ou celular na mesma rede), e ao finalizar
o app gera automaticamente um **PDF** com todas as respostas e salva na pasta `checklists_preenchidos/`.

## Executando pelo Executável (.exe) — Recomendado para Servidor

Você **não precisa instalar o Node.js** no servidor para rodar o app!

O arquivo executável compilado está em:
```
dist/checklist-teto-mercury.exe
```

### Como usar no Servidor:
1. Copie o arquivo `checklist-teto-mercury.exe` (da pasta `dist/`) para qualquer pasta no servidor (ex: `C:\Checklist\`).
2. Dê **dois cliques** em `checklist-teto-mercury.exe` (ou execute via Prompt de Comando).
3. Uma janela abrirá mostrando:
   - O link de acesso local: `http://localhost:1220`
   - O link de acesso pela rede (IP do servidor): `http://<IP-DO-SERVIDOR>:1220`
4. A pasta `checklists_preenchidos/` será criada automaticamente **ao lado do executável**, salvando todos os PDFs organizados por Ano e Mês (`YYYY/MM/`).

> **Dica de Porta:** Por padrão a porta é `1220`. Se quiser mudar para outra porta (ex: 8080), execute pelo CMD:
> ```cmd
> set PORT=8080 && checklist-teto-mercury.exe
> ```

---

## Como rodar em modo Desenvolvimento (Node.js)

Se preferir rodar com Node.js no ambiente de desenvolvimento:

1. Instale as dependências:
   ```cmd
   npm install
   ```
2. Inicie o servidor:
   ```cmd
   npm start
   ```
3. Para gerar um novo arquivo `.exe` após fazer alterações no código:
   ```cmd
   npm run build:exe
   ```

## Uso e Recursos PWA (Progressive Web App)

1. **Instalação como Aplicativo Nativo (PWA):**
   - No celular/tablet (Chrome, Edge ou Safari), acesse o link de rede (`http://<IP-DO-SERVIDOR>:1220`).
   - Clique no botão **"📲 Instalar App"** no topo ou em *"Adicionar à tela de início"*.
   - O aplicativo funcionará em tela cheia (standalone), sem barras de navegador.

2. **Funcionamento 100% Offline (Chão de Fábrica):**
   - O app baixa todos os diagramas de montagem, telas e perguntas na memória do dispositivo via Service Worker.
   - Mesmo se o operador perder o sinal de Wi-Fi no meio da linha, ele pode continuar preenchendo normalmente.
   - O badge no topo indicará automaticamente `🟢 Online` ou `🟠 Offline`.

3. **Fila de Sincronização Automática:**
   - Ao clicar em **"Gerar PDF e Salvar"** sem conexão, o checklist é armazenado com segurança no dispositivo.
   - Assim que o tablet reconectar à rede da fábrica, os checklists pendentes são enviados e os PDFs são gerados automaticamente no servidor (ou pelo botão `🔄 Sincronizar`).

4. **Histórico:**
   - Use o botão **"Histórico"** no topo para consultar e baixar relatórios gerados anteriormente organizados por mês/ano.

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
├── server.js               → servidor Express + gerador de pastas por data e API
├── pdf-generator.js        → lógica de montagem do PDF (PDFKit)
├── checklist-data.js       → estrutura do checklist (seções, perguntas, imagens)
├── package.json            → dependências do projeto (Express, PDFKit)
├── public/
│   ├── index.html          → tela do formulário (com suporte a PWA)
│   ├── style.css           → estilos visuais
│   ├── script.js           → lógica do wizard de etapas e comunicação
│   ├── manifest.json       → manifesto PWA
│   ├── sw.js               → Service Worker para funcionamento offline
│   └── images/             → imagens de referência de cada item + logo + ícones PWA
└── checklists_preenchidos/ → PDFs gerados organizados por pastas Ano/Mês
```
