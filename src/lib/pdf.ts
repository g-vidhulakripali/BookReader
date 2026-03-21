import * as pdfjsLib from 'pdfjs-dist';
// Using standard Vite way to import worker as url
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set the workerSrc
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const loadPDF = async (file: File): Promise<pdfjsLib.PDFDocumentProxy> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
    return await loadingTask.promise;
  } catch (error) {
    console.error('Error loading PDF:', error);
    throw new Error('Failed to parse PDF document.');
  }
};
