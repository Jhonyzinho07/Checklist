// script.js — lógica do formulário de checklist com suporte avançado a PWA (Offline & Sync), Zoom de Imagens e Validação Estrita

let checklistData = null;
let etapaAtual = 0; // Controle da etapa atual
const respostas = {};       // { itemId: 'SIM' | 'NAO' }
const observacoesExtra = {}; // { itemId: 'texto livre do montador' }

// Elementos do DOM principais
const secoesContainer = document.getElementById("secoes-container");
const camposCabecalhoContainer = document.getElementById("campos-cabecalho");
const btnGerar = document.getElementById("btn-gerar");
const mensagemStatus = document.getElementById("mensagem-status");
const barraFill = document.getElementById("barra-progresso-fill");
const progressoTexto = document.getElementById("progresso-texto");
const badgeRede = document.getElementById("badge-rede");
const btnSync = document.getElementById("btn-sync");
const btnInstalar = document.getElementById("btn-instalar");
const pwaToast = document.getElementById("pwa-toast");
const pwaToastMsg = document.getElementById("pwa-toast-mensagem");
const pwaToastAcao = document.getElementById("pwa-toast-acao");

// Elementos do Modal de Zoom
const modalZoom = document.getElementById("modal-zoom");
const modalZoomImg = document.getElementById("modal-zoom-img");
const modalZoomLegenda = document.getElementById("modal-zoom-legenda");
const modalZoomObs = document.getElementById("modal-zoom-obs");
const modalZoomViewport = document.getElementById("modal-zoom-viewport");
const btnZoomIn = document.getElementById("zoom-in");
const btnZoomOut = document.getElementById("zoom-out");
const btnZoomReset = document.getElementById("zoom-reset");
const btnFecharZoom = document.getElementById("fechar-zoom");

// Estado do Zoom
let zoomScale = 1;
let zoomPosX = 0;
let zoomPosY = 0;
let isDraggingZoom = false;
let zoomStartX = 0;
let zoomStartY = 0;

const CHAVE_STORAGE_OFFLINE = "checklists_pendentes_offline";
let deferredPrompt = null;
let isSincronizando = false;

// Inicialização da Aplicação
init();

async function init() {
  configurarPWA();
  configurarMonitorRede();
  configurarModalZoom();
  atualizarBotaoSync();

  try {
    const resp = await fetch("/api/checklist-data");
    if (!resp.ok) throw new Error("Falha ao carregar dados do checklist");
    checklistData = await resp.json();

    document.getElementById("doc-info").textContent =
      `${checklistData.documento.codigo} · ${checklistData.documento.revisao} · Cliente: ${checklistData.documento.cliente}`;

    renderCabecalho();
    renderSecoes();
    atualizarProgresso();
  } catch (err) {
    console.warn("Erro ao buscar dados online/cache:", err);
    mensagemStatus.className = "mensagem-status erro";
    mensagemStatus.textContent = "Não foi possível carregar o formulário. Verifique a conexão.";
  }

  btnGerar.addEventListener("click", gerarPDF);
  document.getElementById("btn-historico").addEventListener("click", abrirHistorico);
  document.getElementById("fechar-historico").addEventListener("click", fecharHistorico);
  btnSync.addEventListener("click", sincronizarPendentes);
}

// ==========================================
// MODAL DE ZOOM DE IMAGEM (LIGHTBOX)
// ==========================================

function configurarModalZoom() {
  if (!modalZoom) return;

  btnZoomIn.addEventListener("click", () => alterarZoom(0.35));
  btnZoomOut.addEventListener("click", () => alterarZoom(-0.35));
  btnZoomReset.addEventListener("click", resetarZoom);
  btnFecharZoom.addEventListener("click", fecharModalZoom);

  // Fecha se clicar no fundo fora dos controles
  modalZoom.addEventListener("click", (e) => {
    if (e.target === modalZoom || e.target === modalZoomViewport) {
      fecharModalZoom();
    }
  });

  // Fechar tecla ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalZoom.classList.contains("escondido")) {
      fecharModalZoom();
    }
  });

  // Zoom através da roda do mouse (Scroll Wheel)
  modalZoomViewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.28 : -0.28;
    alterarZoom(delta);
  }, { passive: false });

  // Duplo clique na imagem para alternar zoom (100% <-> 220%)
  modalZoomImg.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (zoomScale > 1.2) {
      resetarZoom();
    } else {
      zoomScale = 2.2;
      zoomPosX = 0;
      zoomPosY = 0;
      aplicarTransformZoom();
    }
  });

  // Arrastar / Mover a imagem com o cursor ou toque (Pointer Events)
  modalZoomViewport.addEventListener("pointerdown", (e) => {
    if (zoomScale <= 1) return;
    isDraggingZoom = true;
    zoomStartX = e.clientX - zoomPosX;
    zoomStartY = e.clientY - zoomPosY;
    modalZoomViewport.classList.add("arrastando");
    modalZoomViewport.setPointerCapture(e.pointerId);
  });

  modalZoomViewport.addEventListener("pointermove", (e) => {
    if (!isDraggingZoom) return;
    zoomPosX = e.clientX - zoomStartX;
    zoomPosY = e.clientY - zoomStartY;
    aplicarTransformZoom();
  });

  function finalizarArrasto(e) {
    if (isDraggingZoom) {
      isDraggingZoom = false;
      modalZoomViewport.classList.remove("arrastando");
      try { modalZoomViewport.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }

  modalZoomViewport.addEventListener("pointerup", finalizarArrasto);
  modalZoomViewport.addEventListener("pointercancel", finalizarArrasto);
}

function abrirModalZoom(src, legenda, observacao) {
  if (!modalZoom) return;
  modalZoomImg.src = src;
  modalZoomLegenda.textContent = legenda;
  modalZoomObs.textContent = observacao || "";
  resetarZoom();
  modalZoom.classList.remove("escondido");
  document.body.style.overflow = "hidden";
}

function fecharModalZoom() {
  if (!modalZoom) return;
  modalZoom.classList.add("escondido");
  document.body.style.overflow = "";
}

function alterarZoom(delta) {
  zoomScale = Math.min(Math.max(zoomScale + delta, 0.7), 4.5);
  if (zoomScale <= 1) {
    zoomPosX = 0;
    zoomPosY = 0;
  }
  aplicarTransformZoom();
}

function resetarZoom() {
  zoomScale = 1;
  zoomPosX = 0;
  zoomPosY = 0;
  aplicarTransformZoom();
}

function aplicarTransformZoom() {
  if (!modalZoomImg) return;
  modalZoomImg.style.transform = `translate(${zoomPosX}px, ${zoomPosY}px) scale(${zoomScale})`;
  if (zoomScale > 1) {
    modalZoomViewport.style.cursor = isDraggingZoom ? "grabbing" : "grab";
  } else {
    modalZoomViewport.style.cursor = "zoom-in";
  }
}

// ==========================================
// PWA & SERVICE WORKER CONFIGURAÇÕES
// ==========================================

function configurarPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  mostrarToast("Nova versão do app disponível!", "Atualizar", () => {
                    window.location.reload();
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn("Falha ao registrar Service Worker:", error);
        });
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstalar) {
      btnInstalar.classList.remove("escondido");
    }
  });

  if (btnInstalar) {
    btnInstalar.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("Usuário aceitou instalar o PWA.");
      }
      deferredPrompt = null;
      btnInstalar.classList.add("escondido");
    });
  }

  window.addEventListener("appinstalled", () => {
    if (btnInstalar) btnInstalar.classList.add("escondido");
    mostrarToast("App instalado com sucesso na tela inicial!", "OK");
  });
}

// ==========================================
// MONITOR DE REDE & FILA OFFLINE
// ==========================================

function configurarMonitorRede() {
  function atualizarStatusRede() {
    if (navigator.onLine) {
      badgeRede.className = "badge-rede online";
      badgeRede.textContent = "🟢 Online";
      badgeRede.title = "Conectado ao servidor";
      sincronizarPendentes();
    } else {
      badgeRede.className = "badge-rede offline";
      badgeRede.textContent = "🟠 Offline";
      badgeRede.title = "Sem conexão. Os checklists serão salvos no dispositivo.";
      mostrarToast("Modo Offline ativado. Você ainda pode preencher normalmente!", "Entendi");
    }
  }

  window.addEventListener("online", atualizarStatusRede);
  window.addEventListener("offline", atualizarStatusRede);
  atualizarStatusRede();
}

function obterFilaOffline() {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE_OFFLINE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function salvarFilaOffline(fila) {
  try {
    localStorage.setItem(CHAVE_STORAGE_OFFLINE, JSON.stringify(fila));
  } catch (e) {
    console.error("Erro ao salvar fila offline:", e);
  }
}

function atualizarBotaoSync() {
  const fila = obterFilaOffline();
  if (fila.length > 0) {
    btnSync.classList.remove("escondido");
    btnSync.textContent = `🔄 Sincronizar (${fila.length})`;
  } else {
    btnSync.classList.add("escondido");
  }
}

function salvarChecklistOffline(payload) {
  const fila = obterFilaOffline();
  fila.push({
    ...payload,
    criadoEmOffline: new Date().toISOString(),
    idLocal: Date.now() + "_" + Math.random().toString(36).substring(2, 7)
  });
  salvarFilaOffline(fila);
  atualizarBotaoSync();

  mensagemStatus.className = "mensagem-status sucesso";
  mensagemStatus.innerHTML = `<strong>💾 Salvo localmente (Offline)!</strong> O checklist será enviado ao servidor assim que houver conexão.`;
  mostrarToast(`Checklist salvo no aparelho (${fila.length} pendente${fila.length > 1 ? 's' : ''}).`, "OK");

  resetarChecklist();
}

async function sincronizarPendentes() {
  if (isSincronizando || !navigator.onLine) return;
  const fila = obterFilaOffline();
  if (fila.length === 0) return;

  isSincronizando = true;
  btnSync.textContent = "🔄 Sincronizando...";
  btnSync.disabled = true;

  const itensRestantes = [];
  let enviadosComSucesso = 0;

  for (const item of fila) {
    try {
      const resp = await fetch("/api/gerar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabecalho: item.cabecalho,
          respostas: item.respostas,
          observacoesExtra: item.observacoesExtra
        })
      });

      const data = await resp.json();
      if (resp.ok && data.ok) {
        enviadosComSucesso++;
      } else {
        itensRestantes.push(item);
      }
    } catch (err) {
      itensRestantes.push(item);
      break;
    }
  }

  salvarFilaOffline(itensRestantes);
  atualizarBotaoSync();
  btnSync.disabled = false;
  isSincronizando = false;

  if (enviadosComSucesso > 0) {
    mostrarToast(`✅ ${enviadosComSucesso} checklist(s) sincronizado(s) com sucesso no servidor!`, "OK");
  }
}

function mostrarToast(mensagem, textoBotao = "OK", acaoCallback = null) {
  if (!pwaToast) return;
  pwaToastMsg.textContent = mensagem;
  pwaToastAcao.textContent = textoBotao;
  pwaToast.classList.remove("escondido");

  pwaToastAcao.onclick = () => {
    pwaToast.classList.add("escondido");
    if (typeof acaoCallback === "function") acaoCallback();
  };

  setTimeout(() => {
    pwaToast.classList.add("escondido");
  }, 6000);
}

// ==========================================
// VALIDAÇÕES E RENDERIZAÇÃO
// ==========================================

function validarCamposCabecalho() {
  if (!checklistData || !checklistData.camposCabecalho) return { valido: true, faltando: [] };
  const faltando = [];
  checklistData.camposCabecalho.forEach((campo) => {
    const input = document.getElementById(`campo-${campo.id}`);
    const valor = input ? input.value.trim() : "";
    if (!valor) {
      faltando.push({ id: campo.id, label: campo.label, input });
    }
  });
  return { valido: faltando.length === 0, faltando };
}

function validarItensChecklist() {
  if (!checklistData || !checklistData.secoes) return { valido: true, faltando: [] };
  const faltando = [];
  checklistData.secoes.forEach((secao, secaoIndex) => {
    secao.itens.forEach((item) => {
      if (respostas[item.id] !== "SIM" && respostas[item.id] !== "NAO") {
        faltando.push({
          id: item.id,
          numero: item.numeroExibido || item.id,
          pergunta: item.pergunta,
          secaoIndex,
          secaoTitulo: secao.titulo
        });
      }
    });
  });
  return { valido: faltando.length === 0, faltando };
}

function renderCabecalho() {
  camposCabecalhoContainer.innerHTML = "";
  checklistData.camposCabecalho.forEach((campo) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <label for="campo-${campo.id}">${campo.label} <span style="color:var(--vermelho);font-weight:bold">*</span></label>
      <input type="text" id="campo-${campo.id}" data-campo="${campo.id}" autocomplete="off" placeholder="Obrigatório" />
    `;
    const input = wrap.querySelector("input");
    input.addEventListener("input", () => {
      if (input.value.trim()) {
        input.classList.remove("campo-invalido");
      }
      atualizarProgresso();
    });
    camposCabecalhoContainer.appendChild(wrap);
  });
}

function secaoAtualRespondida() {
  if (!checklistData || !checklistData.secoes[etapaAtual]) return false;
  const secao = checklistData.secoes[etapaAtual];
  return secao.itens.every((item) => respostas[item.id] !== undefined);
}

function renderSecoes() {
  if (!checklistData || !checklistData.secoes[etapaAtual]) return;
  secoesContainer.innerHTML = "";
  
  const secao = checklistData.secoes[etapaAtual];

  const tituloEl = document.createElement("div");
  tituloEl.className = "secao-titulo";
  tituloEl.textContent = `${secao.titulo} (Etapa ${etapaAtual + 1} de ${checklistData.secoes.length})`;
  secoesContainer.appendChild(tituloEl);

  const corpoEl = document.createElement("div");
  corpoEl.className = "secao-corpo";

  secao.itens.forEach((item) => {
    corpoEl.appendChild(renderItem(item));
  });

  // Botões de Navegação entre Etapas
  const navDiv = document.createElement("div");
  navDiv.className = "navegacao-etapas";

  const btnVoltar = document.createElement("button");
  btnVoltar.type = "button";
  btnVoltar.className = "btn-secundario";
  btnVoltar.textContent = "← Anterior";
  btnVoltar.disabled = etapaAtual === 0; 
  btnVoltar.addEventListener("click", () => {
    etapaAtual--;
    renderSecoes();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const btnProximo = document.createElement("button");
  btnProximo.id = "btn-proximo";
  btnProximo.type = "button";
  btnProximo.className = "btn-proximo";
  btnProximo.textContent = "Próxima Etapa →";
  btnProximo.disabled = !secaoAtualRespondida();
  
  if (etapaAtual === checklistData.secoes.length - 1) {
    btnProximo.style.display = "none";
  }

  btnProximo.addEventListener("click", () => {
    etapaAtual++;
    renderSecoes();
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Imagem de referência com suporte a Zoom / Lightbox
  if (item.imagem) {
    const imgWrap = document.createElement("div");
    imgWrap.className = "item-imagem-wrap";
    imgWrap.setAttribute("title", "Toque ou clique para dar zoom e ver detalhes");

    const img = document.createElement("img");
    img.className = "item-imagem";
    img.src = `images/${item.imagem}`;
    img.alt = `Referência visual — item ${numero}`;
    img.loading = "lazy";

    const dica = document.createElement("span");
    dica.className = "item-imagem-zoom-dica";
    dica.innerHTML = `🔍 Clique para ampliar`;

    imgWrap.appendChild(img);
    imgWrap.appendChild(dica);

    imgWrap.addEventListener("click", () => {
      abrirModalZoom(
        `images/${item.imagem}`,
        `Item ${numero} · ${item.pergunta}`,
        item.observacao ? `Observação: ${item.observacao}` : ""
      );
    });

    div.appendChild(imgWrap);
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

  const btnProximo = document.getElementById("btn-proximo");
  if (btnProximo) {
    btnProximo.disabled = !secaoAtualRespondida();
  }
}

function totalItens() {
  if (!checklistData || !checklistData.secoes) return 0;
  return checklistData.secoes.reduce((acc, s) => acc + s.itens.length, 0);
}

function atualizarProgresso() {
  const total = totalItens();
  const respondidos = Object.keys(respostas).length;
  const pct = total === 0 ? 0 : Math.round((respondidos / total) * 100);
  barraFill.style.width = `${pct}%`;
  progressoTexto.textContent = `${respondidos} / ${total} itens respondidos`;

  const checagemCabecalho = validarCamposCabecalho();
  const tudoRespondido = respondidos >= total && total > 0;
  const podeGerar = checagemCabecalho.valido && tudoRespondido;

  btnGerar.disabled = !podeGerar;

  if (!podeGerar) {
    if (!checagemCabecalho.valido && tudoRespondido) {
      btnGerar.title = `Preencha os campos obrigatórios: ${checagemCabecalho.faltando.map(c => c.label).join(", ")}`;
    } else if (!tudoRespondido) {
      btnGerar.title = "Responda todas as perguntas do checklist antes de gerar o PDF";
    }
  } else {
    btnGerar.title = "Clique para gerar o PDF e salvar";
  }
}

function coletarCabecalho() {
  const cabecalho = {};
  if (!checklistData || !checklistData.camposCabecalho) return cabecalho;
  checklistData.camposCabecalho.forEach((campo) => {
    const input = document.getElementById(`campo-${campo.id}`);
    cabecalho[campo.id] = input ? input.value.trim() : "";
  });
  return cabecalho;
}

async function gerarPDF() {
  // 1. Validação estrita do Cabeçalho
  const checagemCabecalho = validarCamposCabecalho();
  if (!checagemCabecalho.valido) {
    checagemCabecalho.faltando.forEach((item, index) => {
      if (item.input) {
        item.input.classList.add("campo-invalido");
        if (index === 0) item.input.focus();
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    const camposNomes = checagemCabecalho.faltando.map((c) => c.label).join(", ");
    mensagemStatus.className = "mensagem-status erro";
    mensagemStatus.textContent = `Atenção: Preencha todos os campos de identificação obrigatórios (${camposNomes}).`;
    mostrarToast(`Preencha os campos: ${camposNomes}`, "Entendi");
    btnGerar.disabled = true;
    return;
  }

  // 2. Validação estrita de todos os Itens do Checklist
  const checagemItens = validarItensChecklist();
  if (!checagemItens.valido) {
    const pendente = checagemItens.faltando[0];
    etapaAtual = pendente.secaoIndex;
    renderSecoes();

    setTimeout(() => {
      const itemEl = document.getElementById(`item-${pendente.id}`);
      if (itemEl) {
        itemEl.classList.add("incompleto-alerta");
        itemEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => itemEl.classList.remove("incompleto-alerta"), 3000);
      }
    }, 120);

    mensagemStatus.className = "mensagem-status erro";
    mensagemStatus.textContent = `Atenção: Faltam ${checagemItens.faltando.length} item(ns) a responder (Item ${pendente.numero} na Etapa ${pendente.secaoIndex + 1}).`;
    mostrarToast(`Item ${pendente.numero} não foi respondido!`, "Ver Item");
    btnGerar.disabled = true;
    return;
  }

  mensagemStatus.className = "mensagem-status";
  mensagemStatus.textContent = "Gerando PDF...";
  btnGerar.disabled = true;

  const payload = {
    cabecalho: coletarCabecalho(),
    respostas,
    observacoesExtra,
  };

  // Se o dispositivo estiver offline antes de tentar a requisição:
  if (!navigator.onLine) {
    salvarChecklistOffline(payload);
    return;
  }

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
    
    resetarChecklist();

  } catch (e) {
    console.warn("Erro de conexão ao enviar para o servidor. Salvando offline:", e);
    salvarChecklistOffline(payload);
  } finally {
    const checagemFinal = validarCamposCabecalho();
    if (Object.keys(respostas).length < totalItens() || !checagemFinal.valido) {
      btnGerar.disabled = true;
    }
  }
}

// ==========================================
// HISTÓRICO
// ==========================================

async function abrirHistorico() {
  const modal = document.getElementById("modal-historico");
  const lista = document.getElementById("lista-historico");
  lista.innerHTML = "Carregando...";
  modal.classList.remove("escondido");

  try {
    const resp = await fetch("/api/historico");
    const arquivos = await resp.json();

    if (!Array.isArray(arquivos) || arquivos.length === 0) {
      lista.innerHTML = `<div class="vazio-historico">Nenhum checklist gerado ainda.</div>`;
      return;
    }

    lista.innerHTML = "";
    arquivos.forEach((arq) => {
      const data = new Date(arq.criadoEm).toLocaleString("pt-BR");
      const kb = Math.round(arq.tamanho / 1024);
      const urlCaminho = arq.caminho ? arq.caminho.split('/').map(p => encodeURIComponent(p)).join('/') : encodeURIComponent(arq.nome);

      const el = document.createElement("div");
      el.className = "item-historico";
      el.innerHTML = `
        <span>${arq.nome}<br><small>${data} · ${kb} KB</small></span>
        <a href="/checklists_preenchidos/${urlCaminho}" target="_blank">Abrir</a>
      `;
      lista.appendChild(el);
    });
  } catch (err) {
    lista.innerHTML = `<div class="vazio-historico">Histórico indisponível no modo offline.</div>`;
  }
}

function fecharHistorico() {
  document.getElementById("modal-historico").classList.add("escondido");
}

function resetarChecklist() {
  for (const key in respostas) delete respostas[key];
  for (const key in observacoesExtra) delete observacoesExtra[key];
  etapaAtual = 0;

  if (checklistData && checklistData.camposCabecalho) {
    checklistData.camposCabecalho.forEach((campo) => {
      const input = document.getElementById(`campo-${campo.id}`);
      if (input) {
        input.value = "";
        input.classList.remove("campo-invalido");
      }
    });
  }

  renderSecoes();
  atualizarProgresso();
  window.scrollTo({ top: 0, behavior: "smooth" });
}