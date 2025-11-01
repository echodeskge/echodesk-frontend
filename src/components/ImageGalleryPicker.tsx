"use client";

import React, { useState } from "react";
import { X, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ImageGalleryPickerProps {
  value: string; // Comma-separated URLs
  onChange: (value: string) => void;
  className?: string;
}

export function ImageGalleryPicker({
  value,
  onChange,
  className,
}: ImageGalleryPickerProps) {
  const [urlInput, setUrlInput] = useState("");

  // Parse comma-separated URLs
  const images = value
    ? value.split(",").map((url) => url.trim()).filter(Boolean)
    : [];

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

  return (
    <div className={cn("space-y-3", className)}>
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
                alt={`Image ${index + 1}`}
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

      {/* Add Image URL */}
      <div className="space-y-2">
        <Label className="text-sm">Add Image URL</Label>
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
            ? `${images.length} image(s) added`
            : "Add images by pasting their URLs"}
        </p>
      </div>
    </div>
  );
}
