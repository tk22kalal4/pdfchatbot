import { toast } from "sonner";
import * as Tesseract from 'tesseract.js';

export interface OcrResult {
  text: string;
}

export interface NotesResult {
  notes: string;
}

/**
 * Extracts images from PDF pages
 * @param pdf The loaded PDF document
 * @param pageNumber The page number to extract images from
 * @returns Array of image data URLs
 */
const extractImagesFromPage = async (pdf: any, pageNumber: number): Promise<string[]> => {
  const page = await pdf.getPage(pageNumber);
  const operatorList = await page.getOperatorList();
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
        toast.loading(`Page ${pageNum} appears to be image-based, using advanced OCR...`);
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
      }
      
      fullText += `Page ${pageNum}:\n${pageText.trim()}\n\n`;
    }
    
    if (imageBasedPagesCount > 0) {
      toast.success(`Advanced OCR completed on ${imageBasedPagesCount} image-based pages`);
    }
    
    console.log("OCR Text:", fullText);
    return { text: fullText || "No text found in the PDF." };
  } catch (error) {
    console.error("OCR Error:", error);
    toast.error("Failed to extract text from PDF");
    throw error;
  }
};

/**
 * Converts OCR text to notes using Groq API
 * @param ocrText The text from OCR
 * @returns The formatted notes
 */
export const generateNotesFromText = async (ocrText: string): Promise<NotesResult> => {
  try {
    const GROQ_API_KEY = "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";
    const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    
    console.log("Using Groq API to generate notes");
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", // Keep current model
        messages: [
          {
            role: "system",
            content: `You are a professional educator and note organizer that MUST create BOTH complete AND easy-to-understand notes from PDF text.

YOUR PRIMARY RESPONSIBILITIES ARE:
1. PRESERVE 100% OF THE INFORMATIONAL CONTENT from the original PDF
2. EXPLAIN everything in the SIMPLEST possible language with proper context

Follow these critical guidelines:

CONTENT PRESERVATION:
- INCLUDE ABSOLUTELY ALL INFORMATION from the original PDF text - DO NOT OMIT ANYTHING
- Preserve every fact, number, terminology, example, and detail from the original text
- If unsure about something, include it anyway - better to include everything than miss important information

MAKING CONTENT EASIER TO UNDERSTAND:
- ALWAYS add a proper introduction to the topic that explains what it is and why it matters
- Connect each concept to basic fundamentals that a beginner would understand
- Break complex ideas into simple explanations with everyday analogies
- Define ALL technical terms or jargon in simple language
- Expand abbreviations and acronyms and explain what they mean
- Break long sentences into multiple short ones for better readability
- Use very simple vocabulary that a 7th grade student could understand
- Add helpful examples for difficult concepts
- Relate abstract concepts to real-world applications whenever possible
- Use cause-and-effect explanations to show relationships between ideas

FORMATTING FOR CLARITY:
- Organize content logically with clear hierarchy
- Use proper HTML formatting to enhance readability
- Wrap main concepts of each paragraph in <strong> tags
- Use bullet points (<ul><li>) with proper spacing between points for clarity
- Use numbered lists (<ol><li>) for sequential steps or processes
- Create tables (<table> tags) for comparative information
- Use clear section headings with proper HTML styling:
  * Main headings: <h1><span style="text-decoration: underline;"><span style="color: rgb(71, 0, 0); text-decoration: underline;">Main Topic</span></span></h1>
  * Secondary headings: <h2><span style="text-decoration: underline;"><span style="color: rgb(26, 1, 157); text-decoration: underline;">Sub-Topic</span></span></h2>
  * Tertiary headings: <h3><span style="text-decoration: underline;"><span style="color: rgb(52, 73, 94); text-decoration: underline;">Specific Point</span></span></h3>
- Ensure all HTML tags are properly closed and nested
- Add proper spacing between sections for visual organization
- Create a logical flow from basic to advanced concepts

REMEMBER: Your output MUST contain 100% of the information from the input text, reorganized into an easy-to-understand format with proper introductions, context, and explanations that connect each concept to its basics.`
          },
          {
            role: "user",
            content: `Create detailed, comprehensive AND easy-to-understand notes from this PDF text, following ALL guidelines. Remember to: 
1. Preserve 100% of the original content 
2. Add proper introductions to each topic
3. Connect each concept to its basics
4. Explain everything in the simplest possible language
5. Include helpful examples and real-world applications

Here is the complete OCR text: ${ocrText}`
          }
        ],
        temperature: 0.7, // Adjusted for better balance between creativity and precision
        max_tokens: 4000,  // Increased token limit to ensure complete coverage
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API error response:", errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    const notes = data.choices[0].message.content;
    
    // Verify we have valid formatted notes
    if (!notes || notes.trim().length === 0) {
      throw new Error("Empty response from Groq API");
    }
    
    // Check if the notes are significantly shorter than the OCR text (potential content loss)
    if (notes.length < ocrText.length * 0.7) {
      console.warn("Warning: Generated notes appear to be significantly shorter than the source text");
      // Still proceed, but with a warning
      toast.warning("Notes may not contain all information from the PDF. Consider reviewing the original text.", {
        duration: 5000,
        position: "top-right"
      });
    }
    
    // Sanitize the notes to ensure valid HTML
    const sanitizedNotes = sanitizeHtml(notes);
    
    return { notes: sanitizedNotes };
    
  } catch (error) {
    console.error("Groq API Error:", error);
    toast.error("Failed to generate complete notes. Falling back to raw OCR text formatting.", {
      duration: 5000,
      position: "top-right"
    });
    
    // Create a better fallback that preserves ALL original text
    const createFormattedNotes = (text: string) => {
      // Start with a header explaining this is fallback formatting
      let formattedHtml = `
        <h1><span style="text-decoration: underline;"><span style="color: rgb(71, 0, 0); text-decoration: underline;">Complete PDF Content (API Processing Failed)</span></span></h1>
        <p>Below is the <strong>complete text</strong> extracted from your PDF with minimal formatting.</p>
      `;
      
      // Extract pages and preserve ALL content
      const pages = text.split('\n\n').filter(page => page.trim().startsWith('Page'));
      
      // If no pages were found, just format the entire text
      if (pages.length === 0) {
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        
        paragraphs.forEach(paragraph => {
          if (paragraph.trim().length > 0) {
            formattedHtml += `<p>${paragraph.trim()}</p>\n`;
          }
        });
        
        return formattedHtml;
      }
      
      // Process each page to preserve ALL content
      pages.forEach(page => {
        const pageLines = page.split('\n');
        const pageTitle = pageLines[0].trim();
        // Join all remaining lines to ensure no content is lost
        const pageContent = pageLines.slice(1).join(' ').trim();
        
        // Add page title as h2
        formattedHtml += `
          <h2><span style="text-decoration: underline;"><span style="color: rgb(26, 1, 157); text-decoration: underline;">${pageTitle}</span></span></h2>
        `;
        
        // Preserve ALL content by creating paragraphs at natural break points
        // This ensures no content is skipped or lost
        const paragraphs = pageContent.split(/(?:\.|\?|\!)(?:\s+|\n)/g)
          .filter(p => p.trim().length > 0)
          .map(p => p.trim() + '.');
        
        if (paragraphs.length > 0) {
          paragraphs.forEach(paragraph => {
            if (paragraph.trim().length > 0) {
              // Highlight potential key terms
              const processed = paragraph
                .replace(/\b([A-Z][a-z]{2,}|[A-Z]{2,})\b/g, '<strong>$1</strong>')
                .trim();
                
              formattedHtml += `<p>${processed}</p>\n`;
            }
          });
        } else {
          // If no paragraphs were detected, preserve the raw content to ensure nothing is lost
          formattedHtml += `<p>${pageContent}</p>\n`;
        }
      });
      
      return formattedHtml;
    };
    
    return { notes: createFormattedNotes(ocrText) };
  }
};

/**
 * Helper function to sanitize HTML and ensure it's valid for TinyMCE
 */
function sanitizeHtml(html: string): string {
  // Apply formatting similar to the provided template logic
  let sanitized = html
    // Ensure proper line breaks after closing tags for better readability
    .replace(/<\/(h[1-3])>/g, '</$1>\n\n')
    .replace(/<\/(ul|ol)>/g, '</$1>\n')
    
    // Fix spacing issues and ensure proper paragraph breaks
    .replace(/>\s+</g, '>\n<')
    
    // Fix nested lists by ensuring proper closing tags
    .replace(/<\/li><li>/g, '</li>\n<li>')
    .replace(/<\/li><\/ul>/g, '</li>\n</ul>')
    .replace(/<\/li><\/ol>/g, '</li>\n</ol>')
    
    // Fix potential unclosed strong tags
    .replace(/<strong>([^<]*)<strong>/g, '<strong>$1</strong>')
    
    // Fix nested strong tags
    .replace(/<strong>([^<]*)<strong>([^<]*)<\/strong>([^<]*)<\/strong>/g, '<strong>$1$2$3</strong>')
    
    // Make sure headings have both opening and closing tags
    .replace(/<h([1-6])([^>]*)>([^<]*)/gi, (match, level, attrs, content) => {
      if (!content.trim()) return match;
      return `<h${level}${attrs}>${content}`;
    })
    
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +/g, ' ')
    
    // Ensure each paragraph has proper spacing
    .replace(/<p>/g, '\n<p>')
    .replace(/<\/p>/g, '</p>\n')
    
    // Clean up bullet points for consistent formatting
    .replace(/<ul><li>/g, '\n<ul>\n<li>')
    .replace(/<\/li><\/ul>/g, '</li>\n</ul>\n')
    
    // Clean up ordered lists for consistent formatting
    .replace(/<ol><li>/g, '\n<ol>\n<li>')
    .replace(/<\/li><\/ol>/g, '</li>\n</ol>\n')
    
    // Ensure headings are properly formatted according to the template
    .replace(/<h1>([^<]+)<\/h1>/g, '<h1><span style="text-decoration: underline;"><span style="color: rgb(71, 0, 0); text-decoration: underline;">$1</span></span></h1>')
    .replace(/<h2>([^<]+)<\/h2>/g, '<h2><span style="text-decoration: underline;"><span style="color: rgb(26, 1, 157); text-decoration: underline;">$1</span></span></h2>')
    .replace(/<h3>([^<]+)<\/h3>/g, '<h3><span style="text-decoration: underline;"><span style="color: rgb(52, 73, 94); text-decoration: underline;">$1</span></span></h3>')
    
    // Fix any double-decorated headings
    .replace(/<h([1-3])><span style="text-decoration: underline;"><span style="color: rgb\([^)]+\); text-decoration: underline;">(<span style="text-decoration: underline;"><span style="color: rgb\([^)]+\); text-decoration: underline;">[^<]+<\/span><\/span>)<\/span><\/span><\/h\1>/g, 
             '<h$1>$2</h$1>');

  return sanitized;
}
