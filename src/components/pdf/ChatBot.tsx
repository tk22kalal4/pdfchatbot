import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, Send, X } from "lucide-react";
import { marked } from "marked";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatBotProps {
  ocrText: string;
  onClose: () => void;
}

export const ChatBot = ({ ocrText, onClose }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I can answer questions about the PDF content. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use environment variable for API key
  const API_KEY = import.meta.env.VITE_API_KEY;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    if (!API_KEY) {
      toast.error("API key not configured. Please check your environment variables.");
      return;
    }
    
    const userMessage = { role: "user" as const, content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsProcessing(true);
    
    let loadingToastId: string | number = "";
    
    try {
      // Add thinking message
      setMessages(prev => [...prev, { role: "assistant", content: "Thinking..." }]);
      
      loadingToastId = toast.loading("Processing your question...", {
        duration: 15000,
        position: "top-right"
      });
      
      const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
      
      console.log("Making API request to OpenRouter...");
      console.log("Using API Key:", API_KEY ? API_KEY.substring(0, 20) + "..." : "Not provided");
      
      const requestBody = {
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that answers questions about PDF content in the ABSOLUTE SIMPLEST language possible.
              You are given OCR text extracted from a PDF document and must answer questions related to it — whether they are directly in the text or not.
              
              IMPORTANT: Your answers must be COMPLETE and include ALL relevant information from the PDF text.
              
              Follow these strict guidelines:
              
              1. Use EXTREMELY simple language — explain as if to a 7-year-old
              2. Format answers EXCLUSIVELY in bullet points with proper spacing between each point
              3. Every bullet point MUST be separated by one line break for readability
              4. Use <strong> HTML tags for important keywords, concepts and definitions
              5. Keep explanations complete — do not leave out ANY important details
              6. If asked to explain any concept, give 1-2 very simple examples
              7. If the answer is not in the text, use your own knowledge to help but mention this fact
              8. ALWAYS add helpful examples or real-life applications
              9. NEVER use technical or medical jargon - explain everything in simple terms
              10. ALWAYS format using HTML <ul><li> for bullet points with proper spacing
              11. Add clear line breaks between different parts of your answer
              12. If asked, create simple tables, comparisons, or explanations using HTML formatting
              13. Always be helpful and supportive
              14. NEVER skip any relevant information from the PDF text in your answer
              15. If the information is complex, break it down into multiple simple points
            
Here's the PDF content to reference:
${ocrText}

Please answer questions related to content.`
          },
          {
            role: "user",
            content: currentInput
          }
        ],
        temperature: 0.9,
        max_tokens: 1000
      };

      console.log("Request body:", requestBody);
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'PDF Chat Assistant'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      // Remove thinking message
      setMessages(prev => prev.filter(m => m.content !== "Thinking..."));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        
        let errorMessage = "Failed to get response from AI";
        try {
          const errorData = JSON.parse(errorText);
          console.error("Parsed error data:", errorData);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("API response data:", data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Invalid response structure:", data);
        throw new Error("Invalid response format from API");
      }
      
      const aiResponse = data.choices[0].message.content;
      
      if (!aiResponse || aiResponse.trim() === "") {
        throw new Error("Empty response from AI");
      }
      
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
      
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      toast.success("Response generated successfully!", { duration: 2000, position: "top-right" });
      
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      
      // Remove thinking message if it exists
      setMessages(prev => prev.filter(m => m.content !== "Thinking..."));
      
      let errorMessage = "Sorry, I encountered an error while processing your question.";
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.message.includes("401")) {
          errorMessage = "Authentication error. The API key may be invalid.";
        } else if (error.message.includes("429")) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
        } else if (error.message.includes("404")) {
          errorMessage = "The AI model is not available. Please try again later.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `${errorMessage} Please try again or rephrase your question.` 
      }]);
      
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      toast.error("Failed to generate response", { duration: 4000, position: "top-right" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-white">
      {/* Header - Mobile optimized */}
      <div className="p-3 md:p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-base md:text-lg font-medium truncate">PDF Chat</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Messages - Scrollable area */}
      <div className="flex-grow overflow-auto p-3 md:p-4 space-y-3 md:space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] md:max-w-[80%] rounded-lg p-3 text-sm md:text-base ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}
            >
              {message.content === "Thinking..." ? (
                <div className="flex items-center space-x-2">
                  <span>Thinking</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              ) : (
                <div 
                  className={`${
                    message.role === 'assistant' 
                      ? 'prose prose-sm md:prose prose-headings:my-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 dark:prose-invert max-w-none' 
                      : 'text-inherit'
                  }`}
                  dangerouslySetInnerHTML={{ 
                    __html: message.role === 'assistant' 
                      ? marked.parse(message.content) 
                      : message.content 
                  }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input form - Mobile optimized */}
      <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t bg-white shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the PDF content..."
            className="flex-grow px-3 py-2 text-sm md:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={isProcessing}
          />
          <Button 
            type="submit" 
            disabled={isProcessing || !input.trim()}
            size="sm"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
