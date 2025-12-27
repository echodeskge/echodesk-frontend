"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEmailSignature, useUpdateEmailSignature } from "@/hooks/api/useSocial";

export function EmailSignatureSettings() {
  const { toast } = useToast();
  const { data: signature, isLoading } = useEmailSignature();
  const updateSignature = useUpdateEmailSignature();

  // Local state
  const [signatureHtml, setSignatureHtml] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [includeOnReply, setIncludeOnReply] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with server data
  useEffect(() => {
    if (signature) {
      setSignatureHtml(signature.signature_html || "");
      setSignatureText(signature.signature_text || "");
      setIsEnabled(signature.is_enabled);
      setIncludeOnReply(signature.include_on_reply);
      setHasChanges(false);
    }
  }, [signature]);

  // Track changes
  useEffect(() => {
    if (signature) {
      const changed =
        signatureHtml !== (signature.signature_html || "") ||
        signatureText !== (signature.signature_text || "") ||
        isEnabled !== signature.is_enabled ||
        includeOnReply !== signature.include_on_reply;
      setHasChanges(changed);
    }
  }, [signatureHtml, signatureText, isEnabled, includeOnReply, signature]);

  const handleSave = () => {
    updateSignature.mutate(
      {
        signature_html: signatureHtml,
        signature_text: signatureText,
        is_enabled: isEnabled,
        include_on_reply: includeOnReply,
      },
      {
        onSuccess: () => {
          toast({
            title: "Signature saved",
            description: "Your email signature has been updated successfully.",
          });
          setHasChanges(false);
        },
        onError: (error: any) => {
          toast({
            title: "Error saving signature",
            description: error.response?.data?.error || "Failed to update signature. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Signature
        </CardTitle>
        <CardDescription>
          Configure your email signature for outgoing emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="signature-enabled">Enable email signature</Label>
            <p className="text-sm text-muted-foreground">
              Automatically append signature to outgoing emails
            </p>
          </div>
          <Switch
            id="signature-enabled"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        <Separator />

        {/* Include on Reply Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="include-on-reply">Include on replies</Label>
            <p className="text-sm text-muted-foreground">
              Include signature when replying to emails
            </p>
          </div>
          <Switch
            id="include-on-reply"
            checked={includeOnReply}
            onCheckedChange={setIncludeOnReply}
          />
        </div>

        <Separator />

        {/* HTML Signature Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="signature-html">Signature (HTML)</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 px-2"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </>
              )}
            </Button>
          </div>
          <Textarea
            id="signature-html"
            placeholder={`Best regards,
<br/><br/>
<strong>John Doe</strong><br/>
Marketing Manager<br/>
<span style="color: #666;">Company Name</span><br/>
<a href="https://example.com" style="color: #0066cc;">www.example.com</a> | +1 234 567 890`}
            value={signatureHtml}
            onChange={(e) => setSignatureHtml(e.target.value)}
            className="min-h-[150px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use HTML tags like &lt;br/&gt;, &lt;strong&gt;, &lt;span style=&quot;...&quot;&gt;, &lt;a href=&quot;...&quot;&gt;.
            <strong className="block mt-1">Tip:</strong> Use inline styles (e.g., style=&quot;color: #0066cc;&quot;) for consistent appearance across email clients.
          </p>
        </div>

        {/* HTML Preview - matches actual email rendering */}
        {showPreview && signatureHtml && (
          <div className="space-y-2">
            <Label>Preview (as it will appear in emails)</Label>
            <div className="rounded-md border bg-white p-4">
              {/* Simulated email with signature */}
              <div className="text-sm text-muted-foreground mb-3 pb-3 border-b border-dashed">
                <span className="italic">Your message will appear here...</span>
              </div>
              {/* Signature with separator - matches backend email_utils.py wrapper */}
              <div
                className="pt-3 border-t border-gray-200 [&_a]:text-[#0066cc] [&_a]:underline"
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#666666",
                }}
                dangerouslySetInnerHTML={{ __html: signatureHtml }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This preview shows how your signature will appear in email clients like Outlook and Gmail.
            </p>
          </div>
        )}

        <Separator />

        {/* Plain Text Fallback */}
        <div className="space-y-2">
          <Label htmlFor="signature-text">Plain Text Fallback</Label>
          <Textarea
            id="signature-text"
            placeholder="Best regards,&#10;John Doe&#10;Company Name"
            value={signatureText}
            onChange={(e) => setSignatureText(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Used for email clients that don&apos;t support HTML. Leave empty to auto-generate from HTML.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={updateSignature.isPending || !hasChanges}
          >
            {updateSignature.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {updateSignature.isPending ? "Saving..." : "Save Signature"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
