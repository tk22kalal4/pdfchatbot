
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface PDFNotesProps {
  notes: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PDFNotes = ({ notes, isOpen, onClose }: PDFNotesProps) => {
  const [notesContent, setNotesContent] = useState(notes);
  
  // Update notes content when notes prop changes
  useEffect(() => {
    setNotesContent(notes);
  }, [notes]);

  const handleCopy = () => {
    navigator.clipboard.writeText(notesContent)
      .then(() => toast.success("Notes copied to clipboard"))
      .catch(() => toast.error("Failed to copy notes"));
  };

  const handleDownload = () => {
    const blob = new Blob([notesContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pdf_notes_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Notes downloaded successfully");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>PDF Notes</DialogTitle>
          <DialogDescription>
            Notes generated from your PDF using AI analysis
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            className="min-h-[50vh] font-mono text-sm"
            value={notesContent}
            onChange={(e) => setNotesContent(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>Copy to Clipboard</Button>
          <Button onClick={handleDownload}>Download Notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
