
import { highlightKeyTerms, highlightMainConcepts, isBulletList, isNumberedList, isPotentialHeading } from "./textFormatting";

/**
 * Creates enhanced fallback notes when API processing fails
 */
export function createEnhancedFallbackNotes(ocrText: string): string {
  // Split the input into pages first if necessary
  const pages = ocrText.split(/Page \d+:/g).filter(page => page.trim().length > 0);
  
  let formattedContent = '';
  
  // If input has multiple pages, format each page separately
  if (pages.length > 1) {
    formattedContent = '<h1><span style="text-decoration: underline;"><span style="color: rgb(71, 0, 0); text-decoration: underline;">Complete PDF Contents</span></span></h1>';
    
    // Process each page individually
    pages.forEach((pageContent, index) => {
      formattedContent += `
        <h2><span style="text-decoration: underline;"><span style="color: rgb(26, 1, 157); text-decoration: underline;">Page ${index + 1}</span></span></h2>
        ${formatTextContent(pageContent.trim())}
      `;
    });
  } else {
    // Format the entire content as a single page
    formattedContent = '<h1><span style="text-decoration: underline;"><span style="color: rgb(71, 0, 0); text-decoration: underline;">Complete PDF Contents</span></span></h1>' +
      formatTextContent(ocrText);
  }
  
  return formattedContent;
}

/**
 * Formats raw text content with enhanced structure
 */
function formatTextContent(text: string): string {
  // Split text into paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  let formattedText = '';
  
  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) return;
    
    // Check if this is a bullet list
    if (isBulletList(paragraph)) {
      formattedText += formatBulletList(paragraph);
      return;
    }
    
    // Check if this is a numbered list
    if (isNumberedList(paragraph)) {
      formattedText += formatNumberedList(paragraph);
      return;
    }
    
    // Check if this might be a heading
    if (isPotentialHeading(paragraph)) {
      const headingLevel = paragraph.length < 40 ? 'h2' : 'h3';
      const color = headingLevel === 'h2' ? 'rgb(26, 1, 157)' : 'rgb(52, 73, 94)';
      
      formattedText += `<${headingLevel}><span style="text-decoration: underline;"><span style="color: ${color}; text-decoration: underline;">${paragraph.trim()}</span></span></${headingLevel}>`;
      return;
    }
    
    // Process regular paragraph text - highlight key terms and main concepts
    const processedParagraph = highlightMainConcepts(highlightKeyTerms(paragraph));
    formattedText += `<p>${processedParagraph}</p>`;
  });
  
  return formattedText;
}

/**
 * Formats bullet lists with proper HTML structure
 */
function formatBulletList(text: string): string {
  const lines = text.split('\n');
  let listHtml = '<ul>';
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;
    
    // Check if line starts with a bullet marker (* - •)
    if (/^\s*[*\-•]\s+/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^\s*[*\-•]\s+/, '');
      // Highlight key terms in list items too
      const highlightedContent = highlightKeyTerms(content);
      listHtml += `<li>${highlightedContent}</li>`;
    } else {
      // For lines that don't start with bullet but are part of the list context
      listHtml += `<li>${highlightKeyTerms(trimmedLine)}</li>`;
    }
  });
  
  listHtml += '</ul>';
  return listHtml;
}

/**
 * Formats numbered lists with proper HTML structure
 */
function formatNumberedList(text: string): string {
  const lines = text.split('\n');
  let listHtml = '<ol>';
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;
    
    // Check if line starts with a number followed by . or )
    if (/^\s*\d+[\.\)]\s+/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^\s*\d+[\.\)]\s+/, '');
      // Highlight key terms in numbered list items too
      const highlightedContent = highlightKeyTerms(content);
      listHtml += `<li>${highlightedContent}</li>`;
    } else {
      // For lines that don't start with number but are part of the list context
      listHtml += `<li>${highlightKeyTerms(trimmedLine)}</li>`;
    }
  });
  
  listHtml += '</ol>';
  return listHtml;
}
