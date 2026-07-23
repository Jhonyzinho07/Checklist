// server.js
// App local (Node + Express) de checklist de produção.

const express = require("express");
const path = require("path");
const fs = require("fs");

const checklistData = require("./checklist-data");
const { gerarPDF } = require("./pdf-generator");

const app = express();
const PORT = process.env.PORT || 3000;

const OUTPUT_DIR = path.join(__dirname, "checklists_preenchidos");
const IMAGES_DIR = path.join(__dirname, "public", "images");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// --- NOVIDADE: Função para ler PDFs dentro das subpastas ---
function lerPdfsRecursivo(dir, baseDir = dir) {
  let resultados = [];
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

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/checklists_preenchidos", express.static(OUTPUT_DIR));

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
        erro: "Existem itens não respondidos.",
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

app.listen(PORT, () => {
  console.log(`\n✅ Checklist Teto Mercury rodando em: http://localhost:${PORT}`);
  console.log(`📁 PDFs preenchidos serão salvos em subpastas dentro de: ${OUTPUT_DIR}\n`);
});