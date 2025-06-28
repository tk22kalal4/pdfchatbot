
/**
 * Fixes common list formatting issues in the API response
 */
export function fixListFormattingIssues(html: string): string {
  let fixed = html;
  
  // Fix incorrect list formats like "* Item" or "- Item" that should be <li>Item</li>
  fixed = fixed.replace(/(<p>|<div>|\s)\*\s+([^<]+)(<\/p>|<\/div>|$)/g, '<ul><li>$2</li></ul>');
  fixed = fixed.replace(/(<p>|<div>|\s)-\s+([^<]+)(<\/p>|<\/div>|$)/g, '<ul><li>$2</li></ul>');
  
  // Fix multiple bullet points in paragraphs
  fixed = fixed.replace(/(<p>.*?)(\*\s+([^*<]+)(\s*\*\s+([^*<]+))+)(<\/p>)/g, (match, start, content, _, __, end) => {
    const items = content.split(/\s*\*\s+/).filter(item => item.trim());
    return '<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
  });
  
  // Fix lists that are incorrectly formatted as paragraphs
  const listPatterns = [
    { regex: /<p>([^:]+):\s*<\/p>\s*<p>\s*\*\s+/g, replacement: '<h3>$1:</h3><ul><li>' },
    { regex: /<p>\s*\*\s+/g, replacement: '<ul><li>' },
    { regex: /<\/p>\s*<p>\s*\*\s+/g, replacement: '</li><li>' },
    { regex: /<\/p>(\s*<p>[^*<])/g, replacement: '</li></ul>$1' },
  ];
  
  for (const pattern of listPatterns) {
    fixed = fixed.replace(pattern.regex, pattern.replacement);
  }
  
  // Fix incomplete closing of lists
  if ((fixed.match(/<ul>/g) || []).length > (fixed.match(/<\/ul>/g) || []).length) {
    fixed += '</ul>';
  }
  if ((fixed.match(/<ol>/g) || []).length > (fixed.match(/<\/ol>/g) || []).length) {
    fixed += '</ol>';
  }
  
  // Fix unclosed list items
  if ((fixed.match(/<li>/g) || []).length > (fixed.match(/<\/li>/g) || []).length) {
    const diff = (fixed.match(/<li>/g) || []).length - (fixed.match(/<\/li>/g) || []).length;
    for (let i = 0; i < diff; i++) {
      fixed += '</li>';
    }
  }
  
  // Fix nested lists that weren't properly nested
  fixed = fixed.replace(/<\/li><li><ul>/g, '<ul>');
  fixed = fixed.replace(/<\/ul><\/li>/g, '</ul></li>');
  
  // Ensure all lists have appropriate list items
  fixed = fixed.replace(/<ul>([^<]+)<\/ul>/g, '<ul><li>$1</li></ul>');
  fixed = fixed.replace(/<ol>([^<]+)<\/ol>/g, '<ol><li>$1</li></ol>');
  
  // Fix consecutive lists
  fixed = fixed.replace(/<\/ul>\s*<ul>/g, '');
  fixed = fixed.replace(/<\/ol>\s*<ol>/g, '');
  
  return fixed;
}

/**
 * Helper function to sanitize HTML and ensure it's valid for TinyMCE
 */
export function sanitizeHtml(html: string): string {
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

/**
 * Check if text appears to be a bullet list
 */
export function isBulletList(text: string): boolean {
  // Check for common bullet patterns
  const bulletPattern1 = /^\s*[•\*\-]\s+.+(\n\s*[•\*\-]\s+.+)+/m;
  const bulletPattern2 = text.split("\n").filter(line => /^\s*[•\*\-]\s+/.test(line)).length > 1;
  const bulletPattern3 = /\n\s*[•\*\-]\s+.+(\n\s*[•\*\-]\s+.+)+/m;
  
  return bulletPattern1.test(text) || bulletPattern2 || bulletPattern3.test(text);
}

/**
 * Check if text appears to be a numbered list
 */
export function isNumberedList(text: string): boolean {
  // Check for common numbered list patterns
  const numberedPattern1 = /^\s*\d+[\.\)]\s+.+(\n\s*\d+[\.\)]\s+.+)+/m;
  const numberedPattern2 = text.split("\n").filter(line => /^\s*\d+[\.\)]\s+/.test(line)).length > 1;
  const numberedPattern3 = /\n\s*\d+[\.\)]\s+.+(\n\s*\d+[\.\)]\s+.+)+/m;
  
  return numberedPattern1.test(text) || numberedPattern2 || numberedPattern3.test(text);
}

/**
 * Check if text might be a heading
 */
export function isPotentialHeading(text: string): boolean {
  // Potential heading characteristics
  return (
    (text.length < 100 && text.trim().endsWith(':')) ||
    (text.length < 60 && !/[.!?]/.test(text.slice(0, -1)) && /^[A-Z]/.test(text)) ||
    (text.length < 40 && text === text.toUpperCase())
  );
}

/**
 * Highlights potential key terms in text
 */
export function highlightKeyTerms(text: string): string {
  // Enhanced highlighting of key terms and main concepts
  const processed = text
    // Highlight terms that are ALL CAPS (likely important)
    .replace(/\b([A-Z]{2,})\b/g, '<strong>$1</strong>')
    
    // Highlight terms that start with capital (potential proper nouns and key concepts)
    .replace(/\b([A-Z][a-z]{2,})\b/g, function(match) {
      // Skip common words that shouldn't be highlighted
      const commonWords = ['The', 'This', 'That', 'These', 'Those', 'They', 'Their', 'Them', 'And', 'But', 'For', 'With', 'About', 'When', 'Where', 'Which', 'Who', 'How', 'What', 'Why', 'While'];
      return commonWords.includes(match) ? match : '<strong>' + match + '</strong>';
    })
    
    // Highlight potential numerical data 
    .replace(/\b(\d+(?:\.\d+)?(?:%|\s*percent)?)\b/g, '<strong>$1</strong>')
    
    // Highlight medical/scientific terms
    .replace(/\b([A-Za-z]+(?:ology|itis|ectomy|otomy|oscopy|oma|ase|gen)s?)\b/g, '<strong>$1</strong>')
    
    // Highlight terms with special characters that might be important (like chemical formulas)
    .replace(/\b([A-Za-z]+[\-\_\+][A-Za-z0-9]+)\b/g, '<strong>$1</strong>');
  
  return processed;
}

/**
 * Enhanced highlighting for sentences to mark main concepts
 */
export function highlightMainConcepts(text: string): string {
  // Split text into sentences
  const sentences = text.replace(/([.!?])\s+/g, "$1|").split("|");
  
  return sentences.map(sentence => {
    if (sentence.trim().length === 0) return sentence;
    
    // Skip processing if sentence is already in a list or contains HTML
    if (sentence.includes('<li>') || sentence.includes('<ul>') || 
        sentence.includes('<ol>') || /^<\/?[a-z]/.test(sentence)) {
      return sentence;
    }
    
    // Find potential main concept phrases (3-4 word phrases) in each sentence
    const mainConceptPattern = /\b([A-Za-z]+\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,2})\b/g;
    let matches = [...sentence.matchAll(mainConceptPattern)];
    
    // Find the most relevant phrases (longer ones tend to be more important)
    if (matches.length > 0) {
      // Sort by length (descending)
      matches.sort((a, b) => b[1].length - a[1].length);
      
      // Take the top 1-2 matches based on sentence length
      const numHighlights = sentence.length > 80 ? 2 : 1;
      const topMatches = matches.slice(0, numHighlights);
      
      // Highlight each top match if not already highlighted
      let processedSentence = sentence;
      for (const match of topMatches) {
        if (!processedSentence.includes(`<strong>${match[1]}</strong>`)) {
          processedSentence = processedSentence.replace(
            new RegExp(`\\b${match[1]}\\b`, 'g'), 
            `<strong>${match[1]}</strong>`
          );
        }
      }
      return processedSentence;
    }
    
    return sentence;
  }).join(' ');
}

