"use client";

import { WhatsAppMessageTemplate } from "@/api/generated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Image as ImageIcon,
  Video,
  FileIcon,
  Phone,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplatePreviewProps {
  template?: WhatsAppMessageTemplate | null;
  className?: string;
  showTitle?: boolean;
}

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    phone_number?: string;
    url?: string;
  }>;
}

export default function TemplatePreview({
  template,
  className,
  showTitle = true,
}: TemplatePreviewProps) {
  if (!template) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardContent className="flex items-center justify-center p-12 text-muted-foreground">
          <div className="text-center space-y-2">
            <MessageSquare className="w-12 h-12 mx-auto opacity-50" />
            <p className="text-sm">No template selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const components = (template.components as TemplateComponent[]) || [];
  const headerComponent = components.find((c) => c.type === "HEADER");
  const bodyComponent = components.find((c) => c.type === "BODY");
  const footerComponent = components.find((c) => c.type === "FOOTER");
  const buttonsComponent = components.find((c) => c.type === "BUTTONS");

  // Highlight parameters in text
  const highlightParameters = (text: string) => {
    if (!text) return null;

    const parts = text.split(/(\{\{\d+\}\})/g);
    return (
      <span>
        {parts.map((part, index) => {
          if (part.match(/\{\{\d+\}\}/)) {
            return (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-1 rounded font-medium"
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  const getHeaderIcon = (format?: string) => {
    switch (format) {
      case "IMAGE":
        return <ImageIcon className="w-5 h-5" />;
      case "VIDEO":
        return <Video className="w-5 h-5" />;
      case "DOCUMENT":
        return <FileIcon className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getButtonIcon = (type: string) => {
    switch (type) {
      case "PHONE_NUMBER":
        return <Phone className="w-3 h-3" />;
      case "URL":
        return <ExternalLink className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Template Preview
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-4">
        {/* WhatsApp Message Bubble */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Header */}
          {headerComponent && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              {headerComponent.format === "TEXT" ? (
                <div className="p-3 font-semibold text-sm">
                  {headerComponent.text}
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-900 p-8 flex flex-col items-center justify-center text-muted-foreground">
                  {getHeaderIcon(headerComponent.format)}
                  <p className="text-xs mt-2 uppercase tracking-wide">
                    {headerComponent.format}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Body */}
          {bodyComponent && (
            <div className="p-3 text-sm whitespace-pre-wrap break-words">
              {highlightParameters(bodyComponent.text || "")}
            </div>
          )}

          {/* Footer */}
          {footerComponent && (
            <div className="px-3 pb-3 text-xs text-muted-foreground">
              {footerComponent.text}
            </div>
          )}

          {/* Buttons */}
          {buttonsComponent && buttonsComponent.buttons && buttonsComponent.buttons.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
              {buttonsComponent.buttons.map((button, index) => (
                <button
                  key={index}
                  className="w-full p-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-medium"
                  disabled
                >
                  {getButtonIcon(button.type)}
                  {button.text}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Template Info */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="text-xs">
            {template.language?.toUpperCase()}
          </Badge>
          {template.category && (
            <Badge variant="outline" className="text-xs">
              {template.category.toString()}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
