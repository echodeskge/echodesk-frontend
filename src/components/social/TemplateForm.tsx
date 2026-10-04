"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { WhatsAppTemplateCreateRequest, WhatsAppTemplateCreateCategoryEnum } from "@/api/generated";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Type,
  AlignLeft,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TemplateFormProps {
  wabaId: string;
  onSubmit: (data: WhatsAppTemplateCreateRequest) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  error?: string;
}

type ComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
type ButtonType = "QUICK_REPLY" | "PHONE_NUMBER" | "URL";

interface TemplateComponent {
  type: ComponentType;
  format?: HeaderFormat;
  text?: string;
  buttons?: Array<{
    type: ButtonType;
    text: string;
    phone_number?: string;
    url?: string;
  }>;
}

export default function TemplateForm({
  wabaId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: TemplateFormProps) {
  const t = useTranslations("social.templates");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [category, setCategory] = useState<string>("UTILITY");
  const [components, setComponents] = useState<TemplateComponent[]>([
    { type: "BODY", text: "" },
  ]);
  const [nameError, setNameError] = useState("");

  const validateName = (value: string) => {
    const namePattern = /^[a-z0-9_]+$/;
    if (!value) {
      setNameError(t("form.nameRequired"));
      return false;
    }
    if (!namePattern.test(value)) {
      setNameError(t("form.nameInvalid"));
      return false;
    }
    if (value.length < 1 || value.length > 512) {
      setNameError(t("form.nameLength"));
      return false;
    }
    setNameError("");
    return true;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    validateName(value);
  };

  const addComponent = (type: ComponentType) => {
    // Check if component already exists (only one HEADER, BODY, FOOTER allowed)
    if (type !== "BUTTONS" && components.some(c => c.type === type)) {
      return;
    }

    const newComponent: TemplateComponent = {
      type,
      ...(type === "HEADER" && { format: "TEXT" as HeaderFormat }),
      text: "",
    };

    setComponents([...components, newComponent]);
  };

  const removeComponent = (index: number) => {
    // Don't allow removing BODY component
    if (components[index].type === "BODY") {
      return;
    }
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, updates: Partial<TemplateComponent>) => {
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], ...updates };
    setComponents(newComponents);
  };

  const addButton = (componentIndex: number) => {
    const component = components[componentIndex];
    if (!component.buttons) {
      component.buttons = [];
    }
    component.buttons.push({
      type: "QUICK_REPLY",
      text: "",
    });
    updateComponent(componentIndex, component);
  };

  const removeButton = (componentIndex: number, buttonIndex: number) => {
    const component = components[componentIndex];
    if (component.buttons) {
      component.buttons = component.buttons.filter((_, i) => i !== buttonIndex);
      updateComponent(componentIndex, component);
    }
  };

  const updateButton = (
    componentIndex: number,
    buttonIndex: number,
    updates: Partial<NonNullable<TemplateComponent["buttons"]>[0]>
  ) => {
    const component = components[componentIndex];
    if (component.buttons) {
      component.buttons[buttonIndex] = { ...component.buttons[buttonIndex], ...updates };
      updateComponent(componentIndex, component);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateName(name)) {
      return;
    }

    // Transform components to the format expected by the API
    const apiComponents = components.map(component => {
      const base: any = {
        type: component.type,
      };

      if (component.type === "HEADER") {
        base.format = component.format;
        if (component.format === "TEXT") {
          base.text = component.text;
        }
      } else if (component.type === "BODY" || component.type === "FOOTER") {
        base.text = component.text;
      } else if (component.type === "BUTTONS") {
        base.buttons = component.buttons;
      }

      return base;
    });

    const templateData: WhatsAppTemplateCreateRequest = {
      waba_id: wabaId,
      name,
      language,
      category: category as any as WhatsAppTemplateCreateCategoryEnum,
      components: apiComponents,
    };

    onSubmit(templateData);
  };

  const hasComponent = (type: ComponentType) => {
    return components.some(c => c.type === type);
  };

  const getParameterCount = (text: string) => {
    const matches = text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("form.basicInfo")}</CardTitle>
          <CardDescription>{t("form.basicInfoDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("form.templateName")} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="my_template_name"
              className={nameError ? "border-destructive" : ""}
            />
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            <p className="text-xs text-muted-foreground">
              {t("form.nameHint")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t("form.language")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("form.languages.en")} (en)</SelectItem>
                  <SelectItem value="ka">{t("form.languages.ka")} (ka)</SelectItem>
                  <SelectItem value="ru">{t("form.languages.ru")} (ru)</SelectItem>
                  <SelectItem value="es">{t("form.languages.es")} (es)</SelectItem>
                  <SelectItem value="fr">{t("form.languages.fr")} (fr)</SelectItem>
                  <SelectItem value="de">{t("form.languages.de")} (de)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t("form.category")} *</Label>
              <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">{t("category.UTILITY")}</SelectItem>
                  <SelectItem value="MARKETING">{t("category.MARKETING")}</SelectItem>
                  <SelectItem value="AUTHENTICATION">{t("category.AUTHENTICATION")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {category === "MARKETING" && t("form.categoryHint.MARKETING")}
                {category === "UTILITY" && t("form.categoryHint.UTILITY")}
                {category === "AUTHENTICATION" && t("form.categoryHint.AUTHENTICATION")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Components */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("form.messageComponents")}</CardTitle>
              <CardDescription>{t("form.messageComponentsDescription")}</CardDescription>
            </div>
            <div className="flex gap-2">
              {!hasComponent("HEADER") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponent("HEADER")}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {t("form.componentType.HEADER")}
                </Button>
              )}
              {!hasComponent("FOOTER") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponent("FOOTER")}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {t("form.componentType.FOOTER")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addComponent("BUTTONS")}
              >
                <Plus className="w-3 h-3 mr-1" />
                {t("form.componentType.BUTTONS")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {components.map((component, index) => (
            <Card key={index} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {component.type === "HEADER" && <Type className="w-4 h-4" />}
                    {component.type === "BODY" && <FileText className="w-4 h-4" />}
                    {component.type === "FOOTER" && <AlignLeft className="w-4 h-4" />}
                    {component.type === "BUTTONS" && <MessageSquare className="w-4 h-4" />}
                    <CardTitle className="text-sm">{t(`form.componentType.${component.type}`)}</CardTitle>
                    {component.type === "BODY" && (
                      <Badge variant="secondary" className="text-xs">{t("form.required")}</Badge>
                    )}
                  </div>
                  {component.type !== "BODY" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeComponent(index)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {component.type === "HEADER" && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("form.format")}</Label>
                      <Select
                        value={component.format}
                        onValueChange={(value: HeaderFormat) =>
                          updateComponent(index, { format: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TEXT">{t("form.formats.TEXT")}</SelectItem>
                          <SelectItem value="IMAGE">{t("form.formats.IMAGE")}</SelectItem>
                          <SelectItem value="VIDEO">{t("form.formats.VIDEO")}</SelectItem>
                          <SelectItem value="DOCUMENT">{t("form.formats.DOCUMENT")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {component.format === "TEXT" && (
                      <div className="space-y-2">
                        <Label>{t("form.headerText")}</Label>
                        <Input
                          value={component.text || ""}
                          onChange={(e) => updateComponent(index, { text: e.target.value })}
                          placeholder={t("form.headerTextPlaceholder")}
                          maxLength={60}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("form.maxCharacters", { max: 60 })}. {component.text?.length || 0}/60
                        </p>
                      </div>
                    )}
                  </>
                )}

                {(component.type === "BODY" || component.type === "FOOTER") && (
                  <div className="space-y-2">
                    <Label>{component.type === "BODY" ? `${t("form.bodyText")} *` : t("form.footerText")}</Label>
                    <Textarea
                      value={component.text || ""}
                      onChange={(e) => updateComponent(index, { text: e.target.value })}
                      placeholder={
                        component.type === "BODY"
                          ? t("form.bodyPlaceholder")
                          : t("form.footerPlaceholder")
                      }
                      rows={component.type === "BODY" ? 4 : 2}
                      maxLength={component.type === "BODY" ? 1024 : 60}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {component.type === "BODY"
                          ? t("form.bodyHint", { count: getParameterCount(component.text || "") })
                          : t("form.maxCharacters", { max: 60 })}
                      </span>
                      <span>{component.text?.length || 0}/{component.type === "BODY" ? 1024 : 60}</span>
                    </div>
                  </div>
                )}

                {component.type === "BUTTONS" && (
                  <div className="space-y-3">
                    {component.buttons?.map((button, buttonIndex) => (
                      <div key={buttonIndex} className="border rounded-md p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{t("form.buttonNumber", { number: buttonIndex + 1 })}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeButton(index, buttonIndex)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                        <Select
                          value={button.type}
                          onValueChange={(value: ButtonType) =>
                            updateButton(index, buttonIndex, { type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QUICK_REPLY">{t("form.buttonTypes.QUICK_REPLY")}</SelectItem>
                            <SelectItem value="URL">{t("form.buttonTypes.URL")}</SelectItem>
                            <SelectItem value="PHONE_NUMBER">{t("form.buttonTypes.PHONE_NUMBER")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={button.text}
                          onChange={(e) =>
                            updateButton(index, buttonIndex, { text: e.target.value })
                          }
                          placeholder={t("form.buttonTextPlaceholder")}
                          maxLength={25}
                        />
                        {button.type === "URL" && (
                          <Input
                            value={button.url || ""}
                            onChange={(e) =>
                              updateButton(index, buttonIndex, { url: e.target.value })
                            }
                            placeholder="https://example.com"
                          />
                        )}
                        {button.type === "PHONE_NUMBER" && (
                          <Input
                            value={button.phone_number || ""}
                            onChange={(e) =>
                              updateButton(index, buttonIndex, { phone_number: e.target.value })
                            }
                            placeholder="+1234567890"
                          />
                        )}
                      </div>
                    ))}
                    {(!component.buttons || component.buttons.length < 3) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addButton(index)}
                        className="w-full"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t("form.addButton")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !!nameError}>
          {isSubmitting ? t("form.creating") : t("createTemplate")}
        </Button>
      </div>
    </form>
  );
}
