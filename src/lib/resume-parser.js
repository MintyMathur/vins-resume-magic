// Resume Tailor — Resume File Parser
// Extracts text locally — NO AI call during upload
// PDF via pdfjs-dist, DOCX via mammoth

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Disable worker — runs on main thread, fine for small docs like resumes
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

async function extractTextFromPdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText.trim();
}

async function extractTextFromDocx(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

export async function extractResumeText(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  const arrayBuffer = await file.arrayBuffer();

  let rawText;
  if (ext === 'pdf') {
    rawText = await extractTextFromPdf(arrayBuffer);
  } else if (ext === 'docx' || ext === 'doc') {
    rawText = await extractTextFromDocx(arrayBuffer);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Please upload a .pdf or .docx file.`);
  }

  if (!rawText || rawText.length < 30) {
    throw new Error('Could not extract enough text from the file.');
  }

  return rawText;
}
