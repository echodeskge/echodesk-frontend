"use client";

import { useState } from "react";
import { WhatsAppMessageTemplate } from "@/api/generated";
import { useWhatsAppStatus, useWhatsAppTemplates } from "@/hooks/api/useSocial";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Search,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TemplatePreview from "./TemplatePreview";
import TemplateParameterInput from "./TemplateParameterInput";

interface TemplateSelectorProps {
  onSelect: (template: WhatsAppMessageTemplate, parameters: Record<string, string>) => void;
  trigger?: React.ReactNode;
  recipientNumber?: string;
  disabled?: boolean;
}

interface WhatsAppStatus {
  connected: boolean;
  accounts_count: number;
  accounts: Array<{
    id: number;
    waba_id: string;
    business_name: string;
    phone_number: string;
    display_phone_number: string;
    quality_rating: string;
    is_active: boolean;
  }>;
}

export default function TemplateSelector({
  onSelect,
  trigger,
  recipientNumber,
  disabled = false,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [parameterErrors, setParameterErrors] = useState<Record<string, string>>({});

  // Fetch WhatsApp status to get WABA ID
  const { data: whatsappStatusData } = useWhatsAppStatus();
  const whatsappStatus = whatsappStatusData as WhatsAppStatus | undefined;
  const wabaId = whatsappStatus?.accounts?.[0]?.waba_id || "";

  // Fetch templates
  const { data: templates, isLoading } = useWhatsAppTemplates(wabaId);

  // Filter approved templates
  const approvedTemplates = (templates || []).filter(
    (t: WhatsAppMessageTemplate) => t.status?.toString() === "APPROVED"
  );

  // Filter by search query
  const filteredTemplates = approvedTemplates.filter((t: WhatsAppMessageTemplate) => {
    const query = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(query) ||
      t.category?.toString().toLowerCase().includes(query) ||
      t.language?.toLowerCase().includes(query)
    );
  });

  const validateParameters = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    Object.keys(parameters).forEach((key) => {
      const value = parameters[key];
      if (!value || value.trim() === "") {
        errors[key] = "This parameter is required";
        isValid = false;
      }
    });

    setParameterErrors(errors);
    return isValid;
  };

  const handleSelect = () => {
    if (!selectedTemplate) return;

    // Validate parameters if template has any
    if (Object.keys(parameters).length > 0) {
      if (!validateParameters()) {
        return;
      }
    }

    onSelect(selectedTemplate, parameters);
    setOpen(false);
    setSelectedTemplate(null);
    setParameters({});
    setParameterErrors({});
    setSearchQuery("");
  };

  const handleTemplateClick = (template: WhatsAppMessageTemplate) => {
    setSelectedTemplate(template);
    setParameters({});
    setParameterErrors({});
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedTemplate(null);
    setParameters({});
    setParameterErrors({});
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" disabled={disabled}>
            <FileText className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Message Template</DialogTitle>
          <DialogDescription>
            Choose an approved template to send to {recipientNumber || "the recipient"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Template List */}
          <div className="space-y-4 flex flex-col">
            <div className="space-y-2">
              <Label htmlFor="search">Search Templates</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, category, or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? "No templates found matching your search" : "No approved templates available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template: WhatsAppMessageTemplate) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        selectedTemplate?.id === template.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{template.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {template.language?.toUpperCase()}
                            </Badge>
                            {template.category && (
                              <Badge variant="outline" className="text-xs">
                                {template.category.toString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {selectedTemplate?.id === template.id && (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Preview and Parameters */}
          <div className="space-y-4 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {selectedTemplate ? (
                  <>
                    <TemplatePreview
                      template={selectedTemplate}
                      showTitle={true}
                    />

                    <TemplateParameterInput
                      template={selectedTemplate}
                      parameters={parameters}
                      onParametersChange={setParameters}
                      errors={parameterErrors}
                    />
                  </>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Select a template from the list to preview and configure it
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedTemplate}
          >
            <Send className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
