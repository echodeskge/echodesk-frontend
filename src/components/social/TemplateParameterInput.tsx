"use client";

import { useState, useEffect } from "react";
import { WhatsAppMessageTemplate } from "@/api/generated";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Hash } from "lucide-react";

interface TemplateParameterInputProps {
  template: WhatsAppMessageTemplate;
  parameters: Record<string, string>;
  onParametersChange: (parameters: Record<string, string>) => void;
  errors?: Record<string, string>;
}

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
}

export default function TemplateParameterInput({
  template,
  parameters,
  onParametersChange,
  errors = {},
}: TemplateParameterInputProps) {
  const [parameterInfo, setParameterInfo] = useState<{
    count: number;
    components: Array<{ type: string; parameters: number[] }>;
  }>({ count: 0, components: [] });

  useEffect(() => {
    // Extract parameter information from template
    const components = (template.components as TemplateComponent[]) || [];
    const info: {
      count: number;
      components: Array<{ type: string; parameters: number[] }>;
    } = { count: 0, components: [] };

    components.forEach((component) => {
      if (component.text) {
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          const paramNumbers = matches.map((m) => parseInt(m.replace(/[{}]/g, "")));
          info.components.push({
            type: component.type,
            parameters: paramNumbers,
          });
          const maxParam = Math.max(...paramNumbers);
          if (maxParam > info.count) {
            info.count = maxParam;
          }
        }
      }
    });

    setParameterInfo(info);

    // Initialize parameters object if empty
    if (Object.keys(parameters).length === 0 && info.count > 0) {
      const initialParams: Record<string, string> = {};
      for (let i = 1; i <= info.count; i++) {
        initialParams[i.toString()] = "";
      }
      onParametersChange(initialParams);
    }
  }, [template]);

  const handleParameterChange = (paramNumber: string, value: string) => {
    onParametersChange({
      ...parameters,
      [paramNumber]: value,
    });
  };

  const getParameterContext = (paramNumber: number): string => {
    for (const comp of parameterInfo.components) {
      if (comp.parameters.includes(paramNumber)) {
        return comp.type;
      }
    }
    return "UNKNOWN";
  };

  const getParameterPreview = (paramNumber: number): string => {
    const comp = parameterInfo.components.find((c) =>
      c.parameters.includes(paramNumber)
    );
    if (!comp) return "";

    const component = (template.components as TemplateComponent[])?.find(
      (c) => c.type === comp.type
    );
    if (!component?.text) return "";

    // Extract the sentence containing this parameter
    const sentences = component.text.split(/[.!?]\s+/);
    const sentenceWithParam = sentences.find((s) =>
      s.includes(`{{${paramNumber}}}`)
    );

    if (sentenceWithParam) {
      // Truncate if too long
      const preview = sentenceWithParam.substring(0, 80);
      return preview.length < sentenceWithParam.length ? preview + "..." : preview;
    }

    return "";
  };

  if (parameterInfo.count === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This template does not require any parameters.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Template Parameters
        </CardTitle>
        <CardDescription>
          Fill in the dynamic values for this template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: parameterInfo.count }, (_, i) => i + 1).map(
          (paramNumber) => {
            const context = getParameterContext(paramNumber);
            const preview = getParameterPreview(paramNumber);
            const error = errors[paramNumber.toString()];

            return (
              <div key={paramNumber} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`param-${paramNumber}`} className="flex items-center gap-2">
                    Parameter {paramNumber}
                    <Badge variant="outline" className="text-xs">
                      {context}
                    </Badge>
                  </Label>
                </div>
                {preview && (
                  <p className="text-xs text-muted-foreground italic">
                    "{preview}"
                  </p>
                )}
                <Input
                  id={`param-${paramNumber}`}
                  value={parameters[paramNumber.toString()] || ""}
                  onChange={(e) =>
                    handleParameterChange(paramNumber.toString(), e.target.value)
                  }
                  placeholder={`Enter value for {{${paramNumber}}}`}
                  className={error ? "border-destructive" : ""}
                />
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            );
          }
        )}

        <div className="pt-2">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Note:</strong> All parameters must be filled before sending the template message.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
