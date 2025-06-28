import { Page } from "react-pdf";

interface PDFPageProps {
  pageNumber: number;
  scale: number;
  isLoaded: boolean;
}

export const PDFPage = ({ pageNumber, scale, isLoaded }: PDFPageProps) => {
  return isLoaded ? (
    <Page
      pageNumber={pageNumber}
      scale={scale}
      className="shadow-md"
      loading={
        <div className="w-full h-[842px] bg-gray-100 animate-pulse rounded-md" />
      }
      error={
        <div className="w-full h-[842px] bg-red-50 flex items-center justify-center text-red-500">
          Error loading page {pageNumber}
        </div>
      }
    />
  ) : (
    <div className="w-full h-[842px] bg-gray-100 animate-pulse rounded-md" />
  );
};