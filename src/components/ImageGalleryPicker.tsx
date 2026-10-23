"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, Plus, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import axios from "@/api/axios";
import { getApiErrorMessage } from "@/lib/utils";

interface ImageGalleryPickerProps {
  value: string; // Comma-separated URLs
  onChange: (value: string) => void;
  className?: string;
}

function parseImageUrls(value: string): string[] {
  return value ? value.split(",").map((url) => url.trim()).filter(Boolean) : [];
}

export function ImageGalleryPicker({
  value,
  onChange,
  className,
}: ImageGalleryPickerProps) {
  const t = useTranslations("imageGalleryPicker");
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse comma-separated URLs
  const images = parseImageUrls(value);
  // Uploads finish after later renders; append to the latest value, not the
  // one captured when the files were picked (several picked files used to
  // overwrite each other and only the last one stayed).
  const valueRef = useRef(value);
  valueRef.current = value;

  const addImageUrl = () => {
    if (urlInput.trim()) {
      const newImages = [...images, urlInput.trim()];
      onChange(newImages.join(", "));
      setUrlInput("");
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages.join(", "));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addImageUrl();
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    // Don't set Content-Type header - let axios handle it automatically with boundary
    const response = await axios.post("/api/upload/image/", formData);
    return response.data.url;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(t("notAnImage", { name: file.name }));
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("tooLarge", { name: file.name }));
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      // Upload together, keep the order the files were picked in.
      const results = await Promise.allSettled(validFiles.map(uploadImage));
      const uploaded: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          uploaded.push(result.value);
        } else {
          const reason = result.status === "rejected" ? result.reason : null;
          console.error("Upload error:", reason);
          toast.error(
            getApiErrorMessage(reason, t("uploadFailed", { name: validFiles[index].name })),
          );
        }
      });
      if (uploaded.length > 0) {
        onChange([...parseImageUrls(valueRef.current), ...uploaded].join(", "));
        toast.success(t("uploaded", { count: uploaded.length }));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      await handleFileSelect(e.dataTransfer.files);
    },
    [images, onChange]
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileSelect(e.target.files);
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("uploading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline font-medium"
              >
                {t("clickToUpload")}
              </button>
              <span className="text-muted-foreground"> {t("orDragAndDrop")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("formats")}
            </p>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
            >
              <img
                src={url}
                alt={t("imageAlt", { index: index + 1 })}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14'%3EInvalid%3C/text%3E%3C/svg%3E";
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Image URL (Optional) */}
      <div className="space-y-2">
        <Label className="text-sm">{t("orAddByUrl")}</Label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addImageUrl}
            disabled={!urlInput.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {images.length > 0
            ? t("imagesAdded", { count: images.length })
            : t("pasteUrlsHint")}
        </p>
      </div>
    </div>
  );
}
