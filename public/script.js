// script.js — lógica do formulário de checklist

let checklistData = null;
let etapaAtual = 0; // Controle da etapa atual
const respostas = {};       // { itemId: 'SIM' | 'NAO' }
const observacoesExtra = {}; // { itemId: 'texto livre do montador' }

const secoesContainer = document.getElementById("secoes-container");
const camposCabecalhoContainer = document.getElementById("campos-cabecalho");
const btnGerar = document.getElementById("btn-gerar");
const mensagemStatus = document.getElementById("mensagem-status");
const barraFill = document.getElementById("barra-progresso-fill");
const progressoTexto = document.getElementById("progresso-texto");

init();

async function init() {
  const resp = await fetch("/api/checklist-data");
  checklistData = await resp.json();

  document.getElementById("doc-info").textContent =
    `${checklistData.documento.codigo} · ${checklistData.documento.revisao} · Cliente: ${checklistData.documento.cliente}`;

  renderCabecalho();
  renderSecoes();
  atualizarProgresso();

  btnGerar.addEventListener("click", gerarPDF);
  document.getElementById("btn-historico").addEventListener("click", abrirHistorico);
  document.getElementById("fechar-historico").addEventListener("click", fecharHistorico);
}

function renderCabecalho() {
  camposCabecalhoContainer.innerHTML = "";
  checklistData.camposCabecalho.forEach((campo) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <label for="campo-${campo.id}">${campo.label}</label>
      <input type="text" id="campo-${campo.id}" data-campo="${campo.id}" />
    `;
    camposCabecalhoContainer.appendChild(wrap);
  });
}

// Verifica se a etapa atual está 100% respondida
function secaoAtualRespondida() {
  const secao = checklistData.secoes[etapaAtual];
  return secao.itens.every((item) => respostas[item.id] !== undefined);
}

function renderSecoes() {
  secoesContainer.innerHTML = "";
  
  // Pega apenas a seção da etapa atual
  const secao = checklistData.secoes[etapaAtual];

  const tituloEl = document.createElement("div");
  tituloEl.className = "secao-titulo";
  // Mostra o progresso das etapas no título (Ex: Etapa 1 de 8)
  tituloEl.textContent = `${secao.titulo} (Etapa ${etapaAtual + 1} de ${checklistData.secoes.length})`;
  secoesContainer.appendChild(tituloEl);

  const corpoEl = document.createElement("div");
  corpoEl.className = "secao-corpo";

  // Desenha os itens da seção atual
  secao.itens.forEach((item) => {
    corpoEl.appendChild(renderItem(item));
  });

  // --- Botões de Navegação ---
  const navDiv = document.createElement("div");
  navDiv.className = "navegacao-etapas";

  const btnVoltar = document.createElement("button");
  btnVoltar.type = "button";
  btnVoltar.className = "btn-secundario";
  btnVoltar.textContent = "← Anterior";
  // Desabilita o botão voltar se estiver na primeira página
  btnVoltar.disabled = etapaAtual === 0; 
  btnVoltar.addEventListener("click", () => {
    etapaAtual--;
    renderSecoes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const btnProximo = document.createElement("button");
  btnProximo.id = "btn-proximo"; // Adicionado um ID para podermos atualizá-lo depois
  btnProximo.type = "button";
  btnProximo.className = "btn-proximo";
  btnProximo.textContent = "Próxima Etapa →";
  
  // Começa desabilitado se faltar alguma resposta na página atual
  btnProximo.disabled = !secaoAtualRespondida();
  
  // Esconde o botão "Próximo" se for a última página
  if (etapaAtual === checklistData.secoes.length - 1) {
    btnProximo.style.display = "none";
  }

  btnProximo.addEventListener("click", () => {
    etapaAtual++;
    renderSecoes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  navDiv.appendChild(btnVoltar);
  navDiv.appendChild(btnProximo);
  corpoEl.appendChild(navDiv);

  secoesContainer.appendChild(corpoEl);
}

function renderItem(item) {
  const numero = item.numeroExibido || item.id;
  const div = document.createElement("div");
  div.className = "item";
  div.id = `item-${item.id}`;

  const linha = document.createElement("div");
  linha.className = "item-linha";

  const pergunta = document.createElement("div");
  pergunta.className = "item-pergunta";
  pergunta.innerHTML = `<span class="item-numero">${numero}</span>${item.pergunta}`;

  const toggle = document.createElement("div");
  toggle.className = "toggle-sim-nao";
  const btnSim = document.createElement("button");
  btnSim.type = "button";
  btnSim.textContent = "SIM";
  const btnNao = document.createElement("button");
  btnNao.type = "button";
  btnNao.textContent = "NÃO";

  // Restaura a cor do botão se ele já tiver sido respondido
  if (respostas[item.id] === "SIM") {
    btnSim.classList.add("ativo-sim");
  } else if (respostas[item.id] === "NAO") {
    btnNao.classList.add("ativo-nao");
    div.classList.add("respondido-nao");
  }

  btnSim.addEventListener("click", () => marcarResposta(item.id, "SIM", div, btnSim, btnNao));
  btnNao.addEventListener("click", () => marcarResposta(item.id, "NAO", div, btnSim, btnNao));

  toggle.appendChild(btnSim);
  toggle.appendChild(btnNao);
  linha.appendChild(pergunta);
  linha.appendChild(toggle);
  div.appendChild(linha);

  if (item.imagem) {
    const img = document.createElement("img");
    img.className = "item-imagem";
    img.src = `images/${item.imagem}`;
    img.alt = `Referência visual — item ${numero}`;
    img.loading = "lazy";
    div.appendChild(img);
  }

  if (item.observacao) {
    const obs = document.createElement("div");
    obs.className = "item-observacao";
    obs.textContent = `Observação: ${item.observacao}`;
    div.appendChild(obs);
  }

  const notaWrap = document.createElement("div");
  notaWrap.className = "item-nota-extra";
  notaWrap.innerHTML = `
    <label>Nota do montador (opcional)</label>
    <textarea placeholder="Alguma observação sobre este item?"></textarea>
  `;
  const textarea = notaWrap.querySelector("textarea");
  // Restaura o texto se o usuário voltar para esta página
  textarea.value = observacoesExtra[item.id] || "";
  
  textarea.addEventListener("input", () => {
    observacoesExtra[item.id] = textarea.value;
  });
  div.appendChild(notaWrap);

  return div;
}

function marcarResposta(itemId, valor, itemEl, btnSim, btnNao) {
  respostas[itemId] = valor;
  btnSim.classList.toggle("ativo-sim", valor === "SIM");
  btnNao.classList.toggle("ativo-nao", valor === "NAO");
  itemEl.classList.toggle("respondido-nao", valor === "NAO");
  
  atualizarProgresso();

  // Toda vez que responder algo, verifica se já pode liberar o botão Próximo
  const btnProximo = document.getElementById("btn-proximo");
  if (btnProximo) {
    btnProximo.disabled = !secaoAtualRespondida();
  }
}

function totalItens() {
  return checklistData.secoes.reduce((acc, s) => acc + s.itens.length, 0);
}

function atualizarProgresso() {
  const total = totalItens();
  const respondidos = Object.keys(respostas).length;
  const pct = total === 0 ? 0 : Math.round((respondidos / total) * 100);
  barraFill.style.width = `${pct}%`;
  progressoTexto.textContent = `${respondidos} / ${total} itens respondidos`;
  btnGerar.disabled = respondidos < total;
}

function coletarCabecalho() {
  const cabecalho = {};
  checklistData.camposCabecalho.forEach((campo) => {
    const input = document.getElementById(`campo-${campo.id}`);
    cabecalho[campo.id] = input ? input.value.trim() : "";
  });
  return cabecalho;
}

async function gerarPDF() {
  mensagemStatus.className = "mensagem-status";
  mensagemStatus.textContent = "Gerando PDF...";
  btnGerar.disabled = true;

  const payload = {
    cabecalho: coletarCabecalho(),
    respostas,
    observacoesExtra,
  };

  try {
    const resp = await fetch("/api/gerar-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      mensagemStatus.className = "mensagem-status erro";
      mensagemStatus.textContent = data.erro || "Não foi possível gerar o PDF.";
      btnGerar.disabled = false;
      return;
    }

    mensagemStatus.className = "mensagem-status sucesso";
    mensagemStatus.innerHTML = `PDF salvo: <a href="${data.url}" target="_blank">${data.arquivo}</a>`;
    
    // Limpa o formulário e volta para a Etapa 1
    resetarChecklist();

  } catch (e) {
    mensagemStatus.className = "mensagem-status erro";
    mensagemStatus.textContent = "Erro de conexão com o servidor.";
  } finally {
    // Garante que o botão de gerar continue bloqueado se os campos tiverem sido resetados
    if (Object.keys(respostas).length < totalItens()) {
      btnGerar.disabled = true;
    }
  }
}

// ---------- Histórico ----------

async function abrirHistorico() {
  const modal = document.getElementById("modal-historico");
  const lista = document.getElementById("lista-historico");
  lista.innerHTML = "Carregando...";
  modal.classList.remove("escondido");

  const resp = await fetch("/api/historico");
  const arquivos = await resp.json();

  if (arquivos.length === 0) {
    lista.innerHTML = `<div class="vazio-historico">Nenhum checklist gerado ainda.</div>`;
    return;
  }

  lista.innerHTML = "";
  arquivos.forEach((arq) => {
    const data = new Date(arq.criadoEm).toLocaleString("pt-BR");
    const kb = Math.round(arq.tamanho / 1024);
    
    // Atualizado para considerar a subpasta de data (ex: 2026/01/Arquivo.pdf)
    const urlCaminho = arq.caminho ? arq.caminho.split('/').map(p => encodeURIComponent(p)).join('/') : encodeURIComponent(arq.nome);

    const el = document.createElement("div");
    el.className = "item-historico";
    el.innerHTML = `
      <span>${arq.nome}<br><small>${data} · ${kb} KB</small></span>
      <a href="/checklists_preenchidos/${urlCaminho}" target="_blank">Abrir</a>
    `;
    lista.appendChild(el);
  });
}

function fecharHistorico() {
  document.getElementById("modal-historico").classList.add("escondido");
}

// Função para zerar o formulário e voltar ao início
function resetarChecklist() {
  // 1. Zera as variáveis de estado
  for (const key in respostas) delete respostas[key];
  for (const key in observacoesExtra) delete observacoesExtra[key];
  etapaAtual = 0;

  // 2. Limpa os campos do cabeçalho
  checklistData.camposCabecalho.forEach((campo) => {
    const input = document.getElementById(`campo-${campo.id}`);
    if (input) input.value = "";
  });

  // 3. Renderiza a primeira etapa novamente e atualiza a barra
  renderSecoes();
  atualizarProgresso();
  
  // 4. Rola a tela para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}