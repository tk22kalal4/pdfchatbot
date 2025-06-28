import { useState } from "react";
import { PDFViewer } from "@/components/PDFViewer";
import { FileUpload } from "@/components/FileUpload";
import { PDFHistory } from "@/components/PDFHistory";
import { toast } from "sonner";

const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit for localStorage

const Index = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File) => {
    setPdfFile(file);
    
    // Save to history
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        // Check the size of the base64 string
        const estimatedSize = base64Data.length * 0.75; // base64 is ~33% larger than binary
        
        if (estimatedSize > MAX_STORAGE_SIZE) {
          toast.warning("File too large to save in history");
          return;
        }

        const historyItem = {
          name: file.name,
          data: base64Data,
          lastOpened: Date.now(),
        };
        
        try {
          const history = JSON.parse(localStorage.getItem("pdfHistory") || "[]");
          const updatedHistory = [
            historyItem,
            ...history.filter((item: any) => item.name !== file.name),
          ].slice(0, 3); // Keep only last 3 PDFs to save space
          
          localStorage.setItem("pdfHistory", JSON.stringify(updatedHistory));
        } catch (storageError) {
          // If storage is full, clear history and try to save just this item
          console.warn("Storage full, clearing history");
          localStorage.clear();
          try {
            localStorage.setItem("pdfHistory", JSON.stringify([historyItem]));
          } catch (finalError) {
            toast.error("Could not save to history: storage full");
          }
        }
      };
      
      reader.onerror = () => {
        toast.error("Error reading file");
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to save PDF to history:", error);
      toast.error("Failed to save PDF to history");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {!pdfFile ? (
          <>
            <PDFHistory onFileSelect={handleFileSelect} />
            <FileUpload onFileSelect={handleFileSelect} />
          </>
        ) : (
          <PDFViewer file={pdfFile} />
        )}
      </div>
    </div>
  );
};

export default Index;