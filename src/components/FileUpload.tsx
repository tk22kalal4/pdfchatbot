import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file?.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`h-[70vh] rounded-lg border-2 border-dashed transition-colors duration-200 flex flex-col items-center justify-center p-8 cursor-pointer
        ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <input {...getInputProps()} />
      <Upload
        className={`w-16 h-16 mb-4 ${
          isDragging ? "text-blue-500" : "text-gray-400"
        }`}
      />
      <p className="text-lg text-gray-600 text-center mb-2">
        Drag & drop your PDF here
      </p>
      <p className="text-sm text-gray-500">or click to select a file</p>
    </div>
  );
};