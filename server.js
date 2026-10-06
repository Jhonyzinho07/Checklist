// server.js
// App local (Node + Express) de checklist de produção.

const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");

const checklistData = require("./checklist-data");
const { gerarPDF } = require("./pdf-generator");

const app = express();
const PORT = process.env.PORT || 1220;

// Localiza com precisão o diretório onde o arquivo executável (.exe) está situado no servidor/PC
function getExecutableDir() {
  if (typeof process.pkg !== "undefined") {
    return path.dirname(process.execPath);
  }

  try {
    const { execSync } = require("child_process");
    if (process.platform === "win32" && process.ppid) {
      const ppidPath = execSync(
        `powershell -NoProfile -Command "(Get-Process -Id ${process.ppid} -ErrorAction SilentlyContinue).Path"`,
        { encoding: "utf8", timeout: 2000 }
      ).trim();

      const ignoredExes = ["node.exe", "powershell.exe", "pwsh.exe", "cmd.exe", "wt.exe", "bash.exe", "code.exe"];
      const exeName = path.basename(ppidPath).toLowerCase();

      if (ppidPath && ppidPath.toLowerCase().endsWith(".exe") && !ignoredExes.includes(exeName)) {
        return path.dirname(ppidPath);
      }
    }
  } catch (err) {}

  return process.cwd();
}

const APP_DIR = getExecutableDir();

// A pasta de armazenamento dos relatórios (PDFs gerados) fica EXATAMENTE na mesma pasta do executável
const OUTPUT_DIR = path.join(APP_DIR, "checklists_preenchidos");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Prioriza pasta 'public' externa se existir (ao lado do .exe), senão usa a embutida (__dirname/public)
const localPublic = path.join(APP_DIR, "public");
const bundledPublic = path.join(__dirname, "public");

if (fs.existsSync(localPublic)) {
  app.use(express.static(localPublic));
}
app.use(express.static(bundledPublic));

const localImages = path.join(APP_DIR, "public", "images");
const bundledImages = path.join(__dirname, "public", "images");
const IMAGES_DIR = fs.existsSync(localImages) ? localImages : bundledImages;

app.use(express.json({ limit: "5mb" }));
app.use("/checklists_preenchidos", express.static(OUTPUT_DIR));

// Função para ler PDFs dentro das subpastas recursivamente
function lerPdfsRecursivo(dir, baseDir = dir) {
  let resultados = [];
  if (!fs.existsSync(dir)) return resultados;
  const itens = fs.readdirSync(dir);
  
  for (const item of itens) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    // Se for uma pasta (ex: "2026", "01"), entra nela para ler os arquivos
    if (stat.isDirectory()) {
      resultados = resultados.concat(lerPdfsRecursivo(fullPath, baseDir));
    } else if (item.toLowerCase().endsWith(".pdf")) {
      // Salva o caminho relativo (ex: 2026/01/Arquivo.pdf) para o front-end achar o link
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      resultados.push({
        nome: item,
        caminho: relativePath,
        criadoEm: stat.birthtime,
        tamanho: stat.size
      });
    }
  }
  return resultados;
}

// ---------- Rotas de API ----------

app.get("/api/checklist-data", (req, res) => {
  res.json(checklistData);
});

app.get("/api/historico", (req, res) => {
  // --- NOVIDADE: Busca os PDFs em todas as subpastas ---
  const arquivos = lerPdfsRecursivo(OUTPUT_DIR)
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  res.json(arquivos);
});

app.post("/api/gerar-pdf", async (req, res) => {
  try {
    const { cabecalho, respostas, observacoesExtra } = req.body;

    if (!cabecalho || !respostas) {
      return res.status(400).json({ ok: false, erro: "Dados incompletos." });
    }

    // 1. Validação estrita de todos os campos de cabeçalho
    const camposCabecalhoFaltando = checklistData.camposCabecalho.filter(
      (c) => !cabecalho[c.id] || !cabecalho[c.id].toString().trim()
    );
    if (camposCabecalhoFaltando.length > 0) {
      return res.status(400).json({
        ok: false,
        erro: `Preencha todos os campos de identificação: ${camposCabecalhoFaltando.map((c) => c.label).join(", ")}.`,
        camposFaltando: camposCabecalhoFaltando.map((c) => c.id),
      });
    }

    // 2. Validação estrita de todas as respostas do checklist
    const faltando = [];
    checklistData.secoes.forEach((secao) => {
      secao.itens.forEach((item) => {
        if (respostas[item.id] !== "SIM" && respostas[item.id] !== "NAO") {
          faltando.push(item.id);
        }
      });
    });
    if (faltando.length > 0) {
      return res.status(400).json({
        ok: false,
        erro: `Existem ${faltando.length} item(ns) do checklist não respondido(s).`,
        itensFaltando: faltando,
      });
    }

    // --- NOVIDADE: Criação das subpastas por data (YYYY/MM) ---
    const agora = new Date();
    const ano = agora.getFullYear().toString();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    
    // Caminho da nova pasta (ex: checklists_preenchidos/2026/01)
    const subPasta = path.join(ano, mes); 
    const diretorioDestino = path.join(OUTPUT_DIR, subPasta);

    // Se a pasta do mês não existir, o Node cria automaticamente
    if (!fs.existsSync(diretorioDestino)) {
      fs.mkdirSync(diretorioDestino, { recursive: true });
    }

    const { fileName } = await gerarPDF({
      checklistData,
      cabecalho,
      respostas,
      observacoesExtra: observacoesExtra || {},
      outputDir: diretorioDestino, // Passa a subpasta como destino
      imagesDir: IMAGES_DIR,
    });

    // Monta a URL para o botão de download no final do checklist
    const urlEncoded = `${ano}/${mes}/${encodeURIComponent(fileName)}`;

    res.json({
      ok: true,
      arquivo: fileName,
      url: `/checklists_preenchidos/${urlEncoded}`,
    });
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    res.status(500).json({ ok: false, erro: "Falha ao gerar o PDF." });
  }
});

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

app.listen(PORT, "0.0.0.0", () => {
  const ips = getLocalIPs();
  console.log("\n========================================================");
  console.log("   CHECKLIST TETO MERCURY - SERVIDOR ONLINE");
  console.log("========================================================");
  console.log(` > Acesso Local (neste PC):   http://localhost:${PORT}`);
  ips.forEach((ip) => {
    console.log(` > Acesso na Rede (outros):   http://${ip}:${PORT}`);
  });
  console.log("--------------------------------------------------------");
  console.log(` > Pasta de PDFs salvos:     ${OUTPUT_DIR}`);
  console.log("========================================================");
  console.log(" (Mantenha esta janela aberta para manter o servidor ativo)\n");
});