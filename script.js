
"use strict";

const jsPDF = window.jspdf?.jsPDF;

const HEADER_IMAGE_PATH =
  "https://raw.githubusercontent.com/ramanand6980vish/globalConstruction_pdfMaker/main/assets/globalconstruction-header.png";

const FOOTER_IMAGE_PATH =
  "https://raw.githubusercontent.com/ramanand6980vish/globalConstruction_pdfMaker/main/assets/globalconstruction-footer.png";

// DOM elements
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

// Company images and generated PDF
let headerImage = null;
let footerImage = null;
let pdfBlob = null;
let pdfObjectUrl = null;

// Settings (all measurements are in millimetres)
const SIDE_IMAGE_MARGIN = 5;
const HEADER_GAP = 12;
const FOOTER_GAP = 8;
const LEFT_TEXT_MARGIN = 20;
const RIGHT_TEXT_MARGIN = 20;
const LINE_HEIGHT = 6.5;
const PARAGRAPH_GAP = 2;
const MAX_CHARACTERS = 50000;

// Display a status message
function showStatus(message, success = false) {
  statusMessage.textContent = message;
  statusMessage.className =
    "status-message" + (success ? " success" : "");
}

function clearStatus() {
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

// Update character and line counts
function updateCounts() {
  const text = documentText.value;

  charCount.textContent =
    `${text.length.toLocaleString()} / ${MAX_CHARACTERS.toLocaleString()} characters`;

  lineCount.textContent =
    `${text.length ? text.split(/\r\n|\r|\n/).length : 0} lines`;

  generateBtn.disabled =
    !jsPDF || !headerImage || !footerImage ||
    text.trim().length === 0 ||
    text.length > MAX_CHARACTERS;
}

// Reset the PDF preview
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

// Invalidate the preview after text changes
function invalidatePreview() {
  resetPreview();
  clearStatus();
  updateCounts();
}

// Load an image URL and convert it to a data URL
async function loadImage(imagePath) {
  const response = await fetch(imagePath);

  if (!response.ok) {
    throw new Error(
      `Image request failed (${response.status}): ${imagePath}`
    );
  }

  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error(
      `The URL did not return an image: ${imagePath}. ` +
      `Received content type: ${blob.type || "unknown"}`
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error(`Could not read image: ${imagePath}`));

    reader.readAsDataURL(blob);
  });
}

// Load both the company header and footer
async function loadHeader() {
  generateBtn.disabled = true;

  try {
    const [loadedHeader, loadedFooter] = await Promise.all([
      loadImage(HEADER_IMAGE_PATH),
      loadImage(FOOTER_IMAGE_PATH)
    ]);

    headerImage = loadedHeader;
    footerImage = loadedFooter;

    showStatus("Company header and footer loaded successfully.", true);
  } catch (error) {
    headerImage = null;
    footerImage = null;

    console.error("Company image loading error:", error);

    showStatus(
      "Could not load the company header or footer. " +
      "Check the image URLs and filenames."
    );
  }

  updateCounts();
}

// Detect the image format from its data URL
function getImageFormat(imageData) {
  if (imageData.startsWith("data:image/png")) {
    return "PNG";
  }

  if (
    imageData.startsWith("data:image/jpeg") ||
    imageData.startsWith("data:image/jpg")
  ) {
    return "JPEG";
  }

  throw new Error("Unsupported image format. Use PNG or JPEG images.");
}

// Draw the header on the current page
function drawHeader(doc) {
  if (!headerImage) {
    throw new Error("Company header image is not loaded.");
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const imageProps = doc.getImageProperties(headerImage);

  const imageWidth = pageWidth - 2 * SIDE_IMAGE_MARGIN;
  const imageHeight =
    (imageWidth * imageProps.height) / imageProps.width;

  doc.addImage(
    headerImage,
    getImageFormat(headerImage),
    SIDE_IMAGE_MARGIN,
    0,
    imageWidth,
    imageHeight
  );

  return imageHeight + HEADER_GAP;
}

// Draw the footer on the current page
// Returns the lowest allowed Y position for body text.
function drawFooter(doc) {
  if (!footerImage) {
    throw new Error("Company footer image is not loaded.");
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imageProps = doc.getImageProperties(footerImage);

  const imageWidth = pageWidth - 2 * SIDE_IMAGE_MARGIN;
  const imageHeight =
    (imageWidth * imageProps.height) / imageProps.width;

  const footerY = pageHeight - imageHeight;

  if (footerY <= 0) {
    throw new Error(
      "The footer image is too tall to fit on an A4 page."
    );
  }

  doc.addImage(
    footerImage,
    getImageFormat(footerImage),
    SIDE_IMAGE_MARGIN,
    footerY,
    imageWidth,
    imageHeight
  );

  return footerY - FOOTER_GAP;
}

// Generate a PDF with a header and footer on every page
function createPdf(text) {
  if (!jsPDF) {
    throw new Error(
      "jsPDF is unavailable. Check the jsPDF script in index.html."
    );
  }

  if (!headerImage || !footerImage) {
    throw new Error("The company header or footer is not loaded.");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const textWidth =
    pageWidth - LEFT_TEXT_MARGIN - RIGHT_TEXT_MARGIN;

  doc.setProperties({
    title: "GlobalConstruction Document",
    creator: "GlobalConstruction PDF Generator"
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(35, 43, 55);

  // Draw the header and footer and calculate the usable area.
  function setupPage() {
    const contentStartY = drawHeader(doc);
    const contentBottomY = drawFooter(doc);

    if (contentStartY + LINE_HEIGHT > contentBottomY) {
      throw new Error(
        "The header and footer leave insufficient room for text. " +
        "Use shorter header/footer images."
      );
    }

    return {
      y: contentStartY,
      bottomY: contentBottomY
    };
  }

  let { y, bottomY } = setupPage();

  function startNewPage() {
    doc.addPage();

    ({ y, bottomY } = setupPage());

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(35, 43, 55);
  }

  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    const lines = paragraph.trim() === ""
      ? [""]
      : doc.splitTextToSize(paragraph, textWidth);

    for (const line of lines) {
      if (y + LINE_HEIGHT > bottomY) {
        startNewPage();
      }

      if (line !== "") {
        doc.text(line, LEFT_TEXT_MARGIN, y);
      }

      y += LINE_HEIGHT;
    }

    // Add a little space after each paragraph.
    if (paragraph.trim() !== "") {
      if (y + PARAGRAPH_GAP <= bottomY) {
        y += PARAGRAPH_GAP;
      } else {
        startNewPage();
      }
    }
  }

  return doc;
}

// Generate PDF preview
generateBtn.addEventListener("click", async () => {
  const text = documentText.value.trim();

  if (!text) {
    showStatus("Please paste your text first.");
    documentText.focus();
    return;
  }

  if (text.length > MAX_CHARACTERS) {
    showStatus(`Please keep your text within ${MAX_CHARACTERS.toLocaleString()} characters.`);
    return;
  }

  if (!jsPDF) {
    showStatus(
      "PDF library unavailable. Check your internet connection."
    );
    return;
  }

  if (!headerImage || !footerImage) {
    showStatus("The company header and footer are not available.");
    return;
  }

  generateBtn.disabled = true;
  downloadBtn.disabled = true;

  const buttonLabel = generateBtn.querySelector("span");

  if (buttonLabel) {
    buttonLabel.textContent = "Generating...";
  }

  clearStatus();

  try {
    // Allow the browser to update the button before generation.
    await new Promise(resolve => setTimeout(resolve, 20));

    const doc = createPdf(text);
    const newPdfBlob = doc.output("blob");

    if (pdfObjectUrl) {
      URL.revokeObjectURL(pdfObjectUrl);
    }

    pdfBlob = newPdfBlob;
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
    console.error("PDF Generation Error:", error);
    resetPreview();

    showStatus(
      "PDF Error: " + (error?.message || String(error))
    );
  } finally {
    updateCounts();

    if (buttonLabel) {
      buttonLabel.textContent = "Generate PDF preview";
    }
  }
});

// Download generated PDF
downloadBtn.addEventListener("click", () => {
  if (!pdfBlob) {
    showStatus("Generate a PDF before downloading.");
    return;
  }

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "GlobalConstruction-document.pdf";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Update the preview when the user edits the text
documentText.addEventListener("input", () => {
  invalidatePreview();
});

// Clear the document
clearBtn.addEventListener("click", () => {
  documentText.value = "";
  invalidatePreview();
  documentText.focus();
});

// Release the preview URL when leaving the page
window.addEventListener("beforeunload", () => {
  if (pdfObjectUrl) {
    URL.revokeObjectURL(pdfObjectUrl);
  }
});

// Initialize the page
updateCounts();
generateBtn.disabled = true;
downloadBtn.disabled = true;
loadHeader();
