"use client";

import { WhatsAppMessageTemplate } from "@/api/generated";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Eye, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  template: WhatsAppMessageTemplate;
  onView?: (templateId: number) => void;
  onSend?: (templateId: number) => void;
  onDelete?: (templateId: number) => void;
  isDeleting?: boolean;
}

export default function TemplateCard({
  template,
  onView,
  onSend,
  onDelete,
  isDeleting = false,
}: TemplateCardProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCategoryBadge = (category?: string) => {
    const categoryColors: Record<string, string> = {
      MARKETING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      UTILITY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      AUTHENTICATION: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    };

    if (!category) return null;

    return (
      <Badge variant="outline" className={cn(categoryColors[category])}>
        {category}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="text-xs">
              {template.language?.toUpperCase()} • Created by {template.created_by_name || "Unknown"}
            </CardDescription>
          </div>
          {getStatusBadge(template.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Badge */}
        <div className="flex gap-2">
          {getCategoryBadge(template.category)}
        </div>

        {/* Components Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Components:</p>
          <div className="bg-muted/50 rounded-md p-3 space-y-2 text-sm">
            {template.components && Array.isArray(template.components) && template.components.map((component: any, index: number) => (
              <div key={index} className="text-xs">
                <span className="font-medium">{component.type}:</span>{" "}
                {component.text || component.format || "N/A"}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onView(template.id!)}
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
          )}
          {onSend && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onSend(template.id!)}
              disabled={template.status !== "APPROVED"}
            >
              <Send className="w-3 h-3 mr-1" />
              Send
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(template.id!)}
              disabled={isDeleting}
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
