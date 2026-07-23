// pdf-generator.js
// Lógica de geração do PDF, isolada do servidor Express para facilitar testes.

const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

function sanitizarNomeArquivo(str) {
  return (str || "sem-numero")
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9_\-]+/g, "_")
    .slice(0, 40);
}

// Lê largura/altura de um PNG diretamente do cabeçalho IHDR (sem dependências externas)
function sizeOfPng(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height };
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Gera o PDF do checklist preenchido.
 * @param {object} params
 * @param {object} params.checklistData - estrutura (checklist-data.js)
 * @param {object} params.cabecalho - campos preenchidos (numeroTeto, op, responsavel, cracha)
 * @param {object} params.respostas - { itemId: 'SIM' | 'NAO' }
 * @param {object} params.observacoesExtra - { itemId: 'texto' }
 * @param {string} params.outputDir - pasta onde salvar o PDF
 * @param {string} params.imagesDir - pasta onde estão as imagens (public/images)
 * @returns {Promise<{filePath: string, fileName: string}>}
 */
function gerarPDF({ checklistData, cabecalho, respostas, observacoesExtra, outputDir, imagesDir }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });

      const agora = new Date();
      const carimboData = agora.toISOString().slice(0, 19).replace(/[:T]/g, "-"); 
      const numeroTeto = sanitizarNomeArquivo(cabecalho.numeroTeto);
      const op = sanitizarNomeArquivo(cabecalho.op);
      
      // Novo nome do arquivo: Teto_Mercury_[N° do Teto]_[OP]_[Data].pdf
      const fileName = `Teto_Mercury_${numeroTeto}_${op}_${carimboData}.pdf`;     
      const filePath = path.join(outputDir, fileName);

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const VERDE_ESCURO = "#1f5c3f";
      const VERDE = "#1f9d55";
      const VERMELHO = "#d1352b";
      const PAGE_WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      function garantirEspaco(altura) {
        const limite = doc.page.height - doc.page.margins.bottom;
        if (doc.y + altura > limite) {
          doc.addPage();
        }
      }

      function cabecalhoDocumento() {
        const logoPath = path.join(imagesDir, "logo.png");
        const topY = doc.y;
        if (fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, doc.page.margins.left, topY, { width: 90 });
          } catch (e) {
            /* segue sem logo */
          }
        }
        doc
          .fontSize(14)
          .fillColor("black")
          .font("Helvetica-Bold")
          .text(checklistData.documento.titulo, doc.page.margins.left + 110, topY + 4, {
            width: PAGE_WIDTH - 220,
            align: "center",
          });
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(
            `${checklistData.documento.codigo}\n${checklistData.documento.revisao}`,
            doc.page.margins.left + PAGE_WIDTH - 100,
            topY,
            { width: 100, align: "right" }
          );

        doc.y = topY + 55;
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(
            `Código do Item: ${checklistData.documento.codigoItem}    |    Cliente: ${checklistData.documento.cliente}    |    IT Referência: ${checklistData.documento.itReferencia}`,
            doc.page.margins.left,
            doc.y,
            { width: PAGE_WIDTH }
          );

        doc.moveDown(0.3);
        doc
          .fontSize(9)
          .text(
            `N° do Teto: ${cabecalho.numeroTeto || "-"}    OP: ${cabecalho.op || "-"}    Responsável: ${
              cabecalho.responsavel || "-"
            }    Crachá: ${cabecalho.cracha || "-"}`,
            doc.page.margins.left,
            doc.y,
            { width: PAGE_WIDTH }
          );
        doc.moveDown(0.3);
        doc
          .fontSize(8)
          .fillColor("#555555")
          .text(`PDF gerado em: ${agora.toLocaleString("pt-BR")}`, doc.page.margins.left, doc.y);
        doc.fillColor("black");
        doc.moveDown(0.6);
        linhaSeparadora();
      }

      function linhaSeparadora() {
        doc
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + PAGE_WIDTH, doc.y)
          .strokeColor("#cccccc")
          .stroke();
        doc.moveDown(0.4);
      }

      function tituloSecao(texto) {
        garantirEspaco(26);
        const y = doc.y;
        doc.rect(doc.page.margins.left, y, PAGE_WIDTH, 20).fill(VERDE_ESCURO);
        doc
          .fillColor("white")
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(texto, doc.page.margins.left + 6, y + 5, { width: PAGE_WIDTH - 12 });
        doc.fillColor("black");
        doc.y = y + 26;
      }

      function itemChecklist(item) {
        garantirEspaco(40);
        const numero = item.numeroExibido || item.id;
        const resposta = respostas[item.id];
        const corResposta = resposta === "SIM" ? VERDE : VERMELHO;

        const startY = doc.y;
        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor("black")
          .text(`${numero}  `, doc.page.margins.left, startY, {
            continued: true,
            width: PAGE_WIDTH - 90,
          });
        doc.font("Helvetica").text(item.pergunta, { width: PAGE_WIDTH - 90 });

        const textEndY = doc.y;
        doc
          .roundedRect(doc.page.margins.left + PAGE_WIDTH - 70, startY - 2, 70, 18, 3)
          .fill(corResposta);
        doc
          .fillColor("white")
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(resposta === "SIM" ? "SIM" : "NÃO", doc.page.margins.left + PAGE_WIDTH - 70, startY + 2, {
            width: 70,
            align: "center",
          });
        doc.fillColor("black");

        doc.y = Math.max(textEndY, startY + 16) + 4;

        if (item.imagem) {
          const imgPath = path.join(imagesDir, item.imagem);
          if (fs.existsSync(imgPath)) {
            try {
              const imgWidth = PAGE_WIDTH * 0.75;
              const dims = sizeOfPng(imgPath);
              const imgHeight = dims ? (dims.height / dims.width) * imgWidth : 200;
              garantirEspaco(imgHeight + 10);
              const imgX = doc.page.margins.left + (PAGE_WIDTH - imgWidth) / 2;
              doc.image(imgPath, imgX, doc.y, { width: imgWidth });
              doc.y += imgHeight + 6;
            } catch (e) {
              /* segue sem imagem */
            }
          }
        }

        if (item.observacao) {
          garantirEspaco(24);
          doc
            .font("Helvetica-Oblique")
            .fontSize(8.5)
            .fillColor("#333333")
            .text(`Observação: ${item.observacao}`, doc.page.margins.left, doc.y, {
              width: PAGE_WIDTH,
            });
          doc.fillColor("black");
          doc.moveDown(0.2);
        }

        const obsExtra = observacoesExtra[item.id];
        if (obsExtra && obsExtra.trim().length > 0) {
          garantirEspaco(24);
          doc
            .font("Helvetica")
            .fontSize(8.5)
            .fillColor("#0b5da0")
            .text(`Nota do montador: ${obsExtra.trim()}`, doc.page.margins.left, doc.y, {
              width: PAGE_WIDTH,
            });
          doc.fillColor("black");
        }

        doc.moveDown(0.6);
        doc
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + PAGE_WIDTH, doc.y)
          .strokeColor("#e5e5e5")
          .stroke();
        doc.moveDown(0.4);
      }

      // ---------- Montagem do documento ----------
      cabecalhoDocumento();

      checklistData.secoes.forEach((secao) => {
        tituloSecao(secao.titulo);
        secao.itens.forEach((item) => itemChecklist(item));
      });

      // Rodapé com numeração de páginas (posição segura, sem forçar nova página)
      const totalPaginas = doc.bufferedPageRange().count;
      const rodapeY = doc.page.height - doc.page.margins.bottom - 20;
      for (let i = 0; i < totalPaginas; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .fillColor("#888888")
          .text(`Página ${i + 1} de ${totalPaginas}`, doc.page.margins.left, rodapeY, {
            width: PAGE_WIDTH,
            align: "center",
            lineBreak: false,
          });
      }

      doc.end();

      stream.on("finish", () => resolve({ filePath, fileName }));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { gerarPDF, sanitizarNomeArquivo };