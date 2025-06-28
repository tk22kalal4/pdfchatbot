
import { toast } from "sonner";
import * as Tesseract from 'tesseract.js';

export interface OcrResult {
  text: string;
}

/**
 * Extracts images from PDF pages
 * @param pdf The loaded PDF document
 * @param pageNumber The page number to extract images from
 * @returns Array of image data URLs
 */
const extractImagesFromPage = async (pdf: any, pageNumber: number): Promise<string[]> => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better image quality
  
  const images: string[] = [];
  
  // Create a canvas to render the page
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return images;
  
  // Render the page to the canvas
  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;
  
  // Get the image data URL for the full page
  const imageDataUrl = canvas.toDataURL('image/png');
  images.push(imageDataUrl);
  
  return images;
}

/**
 * Performs OCR on PDF pages using either PDF.js text extraction or Tesseract for image-based PDFs
 * @param file The PDF file
 * @param pageNumbers Array of page numbers to process
 * @returns The OCR result
 */
export const performOCR = async (file: File, pageNumbers: number[]): Promise<OcrResult> => {
  try {
    // Import PDF.js
    const pdfjs = await import('pdfjs-dist');
    const pdfjsLib = pdfjs;
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
    
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    
    let fullText = '';
    let imageBasedPagesCount = 0;
    
    // Process each requested page
    for (const pageNum of pageNumbers) {
      if (pageNum > pdf.numPages || pageNum < 1) continue;
      
      // Try to extract text using PDF.js first (works for text-based PDFs)
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      let pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      // If not enough text was extracted, fallback to Tesseract OCR
      if (pageText.trim().length < 50) {
        toast.loading(`Page ${pageNum} appears to be image-based, using advanced OCR...`, {
          position: "top-right",
          id: `ocr-page-${pageNum}`
        });
        imageBasedPagesCount++;
        
        // Extract images from the page
        const images = await extractImagesFromPage(pdf, pageNum);
        
        // Process each image with Tesseract
        for (const imageUrl of images) {
          // Use Tesseract.js to perform OCR on the image
          const result = await Tesseract.recognize(
            imageUrl,
            'eng',
            {
              logger: (m) => {
                // Optional: Log progress to console
                if (m.status === 'recognizing text') {
                  console.log(`Recognizing text: ${Math.floor(m.progress * 100)}%`);
                }
              }
            }
          );
          
          // Add the recognized text
          pageText += ' ' + result.data.text;
        }
        toast.dismiss(`ocr-page-${pageNum}`);
      }
      
      fullText += `Page ${pageNum}:\n${pageText.trim()}\n\n`;
    }
    
    if (imageBasedPagesCount > 0) {
      toast.success(`Advanced OCR completed on ${imageBasedPagesCount} image-based pages`, {
        position: "top-right"
      });
    }
    
    console.log("OCR Text:", fullText);
    return { text: fullText || "No text found in the PDF." };
  } catch (error) {
    console.error("OCR Error:", error);
    toast.error("Failed to extract text from PDF", {
      position: "top-right"
    });
    throw error;
  }
};
