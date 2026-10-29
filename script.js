
"use strict";

const jsPDF = window.jspdf?.jsPDF;

const HEADER_IMAGE_PATH = "https://github.com/ramanand6980vish/globalConstruction_pdfMaker/blob/main/assets/globalconstruction-header.png";

const documentText = document.getElementById("documentText");
const charCount = document.getElementById("charCount");
const lineCount = document.getElementById("lineCount");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusMessage = document.getElementById("statusMessage");
const emptyPreview = document.getElementById("emptyPreview");
const pdfPreviewWrap = document.getElementById("pdfPreviewWrap");
const pdfPreview = document.getElementById("pdfPreview");
const previewDescription = document.getElementById("previewDescription");
const pageInfo = document.getElementById("pageInfo");

let headerImage = null;
let pdfBlob = null;
let pdfObjectUrl = null;

function showStatus(message, success = false) {
  statusMessage.textContent = message;
  statusMessage.className =
    "status-message" + (success ? " success" : "");
}

function clearStatus() {
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

function updateCounts() {
  const text = documentText.value;

  charCount.textContent =
    `${text.length.toLocaleString()} / 50,000 characters`;

  lineCount.textContent =
    `${text.length ? text.split(/\r\n|\r|\n/).length : 0} lines`;
}

function resetPreview() {
  if (pdfObjectUrl) {
    URL.revokeObjectURL(pdfObjectUrl);
    pdfObjectUrl = null;
  }

  pdfBlob = null;
  pdfPreview.src = "about:blank";
  pdfPreviewWrap.hidden = true;
  emptyPreview.hidden = false;
  downloadBtn.disabled = true;

  pageInfo.textContent = "No PDF generated yet";
  previewDescription.textContent = "Your PDF will appear here.";
}

function invalidatePreview() {
  resetPreview();
  clearStatus();
}

// Load the permanent company header when the website starts.
async function loadHeader() {
  try {
    const response = await fetch(HEADER_IMAGE_PATH);

    if (!response.ok) {
      throw new Error("Header image not found.");
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      throw new Error("The header file is not a valid image.");
    }

    headerImage = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read header image."));
      reader.readAsDataURL(blob);
    });

    generateBtn.disabled = false;
    showStatus("GlobalConstruction header loaded.", true);
  } catch (error) {
    headerImage = null;
    generateBtn.disabled = true;

    showStatus(
      "Company header could not be loaded. Check that " +
      HEADER_IMAGE_PATH + " exists in your project."
    );

    console.error(error);
  }
}

function drawHeader(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const imageProps = doc.getImageProperties(headerImage);

  const sideMargin = 5;
  const logoWidth = pageWidth - 2 * sideMargin;
  const logoHeight =
    (logoWidth * imageProps.height) / imageProps.width;

  const format = headerImage.startsWith("data:image/jpeg")
    ? "JPEG"
    : "PNG";

  doc.addImage(
    headerImage,
    format,
    sideMargin,
    0,
    logoWidth,
    logoHeight
  );

  return logoHeight + 12; // Content starts 12 mm below header
}

function drawFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imageProps = doc.getImageProperties(footerImage);

  const sideMargin = 5;
  const footerWidth = pageWidth - 2 * sideMargin;
  const footerHeight =
    (footerWidth * imageProps.height) / imageProps.width;

  const format = footerImage.startsWith("data:image/jpeg")
    ? "JPEG"
    : "PNG";

  const footerY = pageHeight - footerHeight;

  doc.addImage(
    footerImage,
    format,
    sideMargin,
    footerY,
    footerWidth,
    footerHeight
  );

  return footerY - 12; // Last allowed content position
}

// function drawHeader(doc) {
//   const pageWidth = doc.internal.pageSize.getWidth();

//   // Read the original image dimensions
//   const imageProps = doc.getImageProperties(headerImage);

//   // Fill the entire page width while preserving aspect ratio
//   const headerHeight =
//     (pageWidth * imageProps.height) / imageProps.width;

//   const format = headerImage.startsWith("data:image/jpeg")
//     ? "JPEG"
//     : "PNG";

//   // Start at the top-left edge and cover the full page width
//   doc.addImage(
//     headerImage,
//     format,
//     3,
//     3,
//     pageWidth,
//     headerHeight
//   );

//   const gap = 10; // Gap between header and document text

//   // Return the height so document text starts below the header
//   return headerHeight + gap;
// }


// function drawFooter(doc, pageNumber, totalPages) {
//   const pageWidth = doc.internal.pageSize.getWidth();
//   const pageHeight = doc.internal.pageSize.getHeight();

//   doc.setDrawColor(220, 226, 234);
//   doc.setLineWidth(0.25);
//   doc.line(20, pageHeight - 17, pageWidth - 20, pageHeight - 17);

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   doc.setTextColor(115, 126, 140);

//   doc.text(
//     `Page ${pageNumber} of ${totalPages}`,
//     pageWidth - 20,
//     pageHeight - 10,
//     { align: "right" }
//   );
// }

function createPdf(text) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const leftMargin = 20;
  const rightMargin = 20;
  const topMargin = 55;
  const bottomMargin = 23;
  const lineHeight = 6.5;
  const textWidth = pageWidth - leftMargin - rightMargin;

  doc.setProperties({
    title: "GlobalConstruction Document",
    creator: "GlobalConstruction PDF Generator"
  });

  let y = drawHeader(doc);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(35, 43, 55);

   
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    const lines = paragraph.trim() === ""
      ? [""]
      : doc.splitTextToSize(paragraph, textWidth);

    for (const line of lines) {
      if (y + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        drawHeader(doc);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(35, 43, 55);

        y = topMargin;
      }

      if (line !== "") {
        doc.text(line, leftMargin, y);
      }

      y += lineHeight;
    }
  }

  const totalPages = doc.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages);
  }

  return doc;
}

function addContentWithPagination(doc, content) {
  const pageWidth = doc.internal.pageSize.getWidth();

  const sideMargin = 15;
  const textWidth = pageWidth - 2 * sideMargin;
  const lineHeight = 6;

  let contentStartY = drawHeader(doc);
  let contentBottomY = drawFooter(doc);
  let y = contentStartY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const paragraphs = content.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      y += 4;
      continue;
    }

    const lines = doc.splitTextToSize(paragraph, textWidth);

    for (const line of lines) {
      // Start a new page before entering the footer area
      if (y + lineHeight > contentBottomY) {
        doc.addPage();

        // Reset both boundaries for the new page
        contentStartY = drawHeader(doc);
        contentBottomY = drawFooter(doc);
        y = contentStartY;
      }

      doc.text(line, sideMargin, y);
      y += lineHeight;
    }

    y += 2; // Paragraph spacing
  }
}

generateBtn.addEventListener("click", async () => {
  const text = documentText.value.trim();

  if (!text) {
    showStatus("Please paste your text first.");
    documentText.focus();
    return;
  }

  if (!headerImage) {
    showStatus("The company header is not available.");
    return;
  }

  if (!jsPDF) {
    showStatus("PDF library unavailable. Check your internet connection.");
    return;
  }

  generateBtn.disabled = true;
  downloadBtn.disabled = true;
  generateBtn.querySelector("span").textContent = "Generating...";
  clearStatus();

  try {
    await new Promise(resolve => setTimeout(resolve, 20));

    const doc = createPdf(text);
    pdfBlob = doc.output("blob");

    if (pdfObjectUrl) {
      URL.revokeObjectURL(pdfObjectUrl);
    }

    pdfObjectUrl = URL.createObjectURL(pdfBlob);
    pdfPreview.src =
      pdfObjectUrl + "#toolbar=1&navpanes=0&view=FitH";

    const totalPages = doc.internal.getNumberOfPages();

    emptyPreview.hidden = true;
    pdfPreviewWrap.hidden = false;
    downloadBtn.disabled = false;

    pageInfo.textContent =
      `${totalPages} page${totalPages === 1 ? "" : "s"} · A4 portrait`;

    previewDescription.textContent =
      "Review your GlobalConstruction document.";

    showStatus("PDF generated successfully.", true);
  } catch (error) {
    console.error(error);
    resetPreview();
    showStatus("Could not generate the PDF. Please try again.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.querySelector("span").textContent =
      "Generate PDF preview";
  }
});

downloadBtn.addEventListener("click", () => {
  if (!pdfBlob) return;

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "GlobalConstruction-document.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

documentText.addEventListener("input", () => {
  updateCounts();
  invalidatePreview();
});

clearBtn.addEventListener("click", () => {
  documentText.value = "";
  updateCounts();
  invalidatePreview();
  documentText.focus();
});

window.addEventListener("beforeunload", () => {
  if (pdfObjectUrl) {
    URL.revokeObjectURL(pdfObjectUrl);
  }
});

updateCounts();
generateBtn.disabled = true;
loadHeader();
