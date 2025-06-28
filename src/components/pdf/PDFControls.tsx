
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Split, MessageSquare, Search } from "lucide-react";

interface PDFControlsProps {
  isLoading: boolean;
  numPages: number;
  onSplit: (start: number, end: number) => void;
  onDownload: () => void;
  onPerformOCR: () => void;
  isSplit: boolean;
  hasOcrText: boolean;
  onToggleChat: () => void;
}

export const PDFControls = ({ 
  isLoading, 
  numPages, 
  onSplit, 
  onDownload, 
  onPerformOCR,
  isSplit,
  hasOcrText,
  onToggleChat
}: PDFControlsProps) => {
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [showSplitControls, setShowSplitControls] = useState(false);

  const handleSplit = () => {
    if (startPage <= endPage && startPage >= 1 && endPage <= numPages) {
      onSplit(startPage, endPage);
      setShowSplitControls(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSplitControls(!showSplitControls)}
          disabled={isLoading || numPages === 0}
          className="flex items-center gap-1"
        >
          <Split size={16} />
          Split PDF
        </Button>
        
        {showSplitControls && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Start"
              value={startPage}
              onChange={(e) => setStartPage(Number(e.target.value))}
              min={1}
              max={numPages}
              className="w-20"
            />
            <span>to</span>
            <Input
              type="number"
              placeholder="End"
              value={endPage}
              onChange={(e) => setEndPage(Number(e.target.value))}
              min={startPage}
              max={numPages}
              className="w-20"
            />
            <Button size="sm" onClick={handleSplit}>
              Apply
            </Button>
          </div>
        )}
      </div>

      {isSplit && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPerformOCR}
          disabled={isLoading}
          className="flex items-center gap-1"
        >
          <Search size={16} />
          {isLoading ? "Processing..." : "Extract Text (OCR)"}
        </Button>
      )}

      {hasOcrText && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleChat}
          className="flex items-center gap-1"
        >
          <MessageSquare size={16} />
          Ask Questions
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onDownload}
        disabled={isLoading}
        className="flex items-center gap-1"
      >
        <Download size={16} />
        Download
      </Button>
    </div>
  );
};
