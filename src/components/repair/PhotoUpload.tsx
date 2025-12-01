import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  onPhotoUpload: (file: File, preview: string) => void;
}

export const PhotoUpload = ({ onPhotoUpload }: PhotoUploadProps) => {
  const [preview, setPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File troppo grande. Max 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        onPhotoUpload(file, result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-11"
          >
            <Camera className="mr-2 h-4 w-4" />
            Scatta Foto
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.click();
              }
            }}
            className="flex-1 h-11"
          >
            <Upload className="mr-2 h-4 w-4" />
            Carica File
          </Button>
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Device preview"
            className="w-full h-48 md:h-64 object-contain rounded-lg border-2 border-border bg-muted"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleClear}
            className="absolute top-2 right-2 h-9 w-9"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
