
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PDFPageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onJumpToPage: (page: number) => void;
}

export const PDFPageNavigator = ({ currentPage, totalPages, onJumpToPage }: PDFPageNavigatorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jumpToPage, setJumpToPage] = useState("");

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
      toast.error(`Please enter a valid page number between 1 and ${totalPages}`);
      return;
    }

    onJumpToPage(pageNum);
    setIsDialogOpen(false);
    setJumpToPage("");
    toast.success(`Jumped to page ${pageNum}`);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm hover:bg-gray-700 transition-colors">
          Page {currentPage} of {totalPages}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jump to Page</DialogTitle>
          <DialogDescription>
            Enter the page number you want to jump to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            type="number"
            placeholder="Enter page number"
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            min={1}
            max={totalPages}
          />
          <Button onClick={handleJumpToPage}>Jump</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
