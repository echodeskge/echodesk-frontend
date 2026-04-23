'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  MessageCircle,
  Check,
  X,
  RefreshCw,
  Plus,
  AlertCircle,
  Loader2,
  Phone,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useWidgetConnections,
  useCreateWidgetConnection,
  useUpdateWidgetConnection,
  type WidgetConnection as WidgetConnectionType,
  type PatchedWidgetConnectionRequest,
} from '@/hooks/api/useSocial';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { WidgetInstallCard } from '@/components/widget-settings/WidgetInstallCard';
import { WidgetAllowedOriginsEditor } from '@/components/widget-settings/WidgetAllowedOriginsEditor';
import {
  WidgetAppearanceForm,
  type WidgetPosition,
} from '@/components/widget-settings/WidgetAppearanceForm';
import {
  WidgetMessagesEditor,
  type PreChatFormConfig,
} from '@/components/widget-settings/WidgetMessagesEditor';
import { WidgetPreviewFrame } from '@/components/widget-settings/WidgetPreviewFrame';

type LocaleText = Record<string, string>;

// Narrow the loose `any` fields on the generated WidgetConnection interface
// to what the backend actually stores. Doing this in one place keeps the
// editor sub-components strictly typed.
function asLocaleText(value: unknown): LocaleText {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as LocaleText;
  }
  return {};
}
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value.filter((v) => typeof v === 'string') as string[]) : [];
}
function asPreChat(value: unknown): PreChatFormConfig {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as PreChatFormConfig;
  }
  return {};
}
function asPosition(value: unknown): WidgetPosition {
  return value === 'bottom-left' ? 'bottom-left' : 'bottom-right';
}

export function WidgetConnection() {
  const t = useTranslations('social.widget');
  const { data: connections, isLoading, error, refetch } = useWidgetConnections();
  const createMutation = useCreateWidgetConnection();
  const updateMutation = useUpdateWidgetConnection();

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Pick the first connection on load if none selected.
  useEffect(() => {
    if (!selectedId && connections && connections.length > 0) {
      setSelectedId(connections[0].id);
    }
  }, [connections, selectedId]);

  const selected: WidgetConnectionType | undefined = useMemo(() => {
    if (!connections) return undefined;
    return connections.find((c) => c.id === selectedId) || connections[0];
  }, [connections, selectedId]);

  const handleCreate = async () => {
    try {
      const created = await createMutation.mutateAsync({
        label: 'Default widget',
        is_active: true,
        allowed_origins: [],
        welcome_message: { en: '', ka: '' },
        offline_message: { en: '', ka: '' },
        pre_chat_form: { enabled: false, name_required: false, email_required: false },
      });
      setSelectedId(created.id);
      toast.success(t('createSuccess'));
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || t('createFailed'));
    }
  };

  // ── Instant-save path for simple toggles/color/position ─────────────────
  //
  // We debounce the actual PATCH by 500ms so rapid slider drags and toggle
  // flurries collapse to a single network call.
  //
  const debouncedPatchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<PatchedWidgetConnectionRequest>>({});
  const [autoSaving, setAutoSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState<null | number>(null);

  useEffect(() => {
    return () => {
      if (debouncedPatchRef.current) clearTimeout(debouncedPatchRef.current);
    };
  }, []);

  const flushPendingPatch = async (id: number) => {
    const toSend = pendingPatchRef.current;
    pendingPatchRef.current = {};
    if (Object.keys(toSend).length === 0) return;
    setAutoSaving(true);
    try {
      await updateMutation.mutateAsync({ id, data: toSend });
      setShowSavedToast(Date.now());
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || t('saveFailed'));
    } finally {
      setAutoSaving(false);
    }
  };

  const scheduleAutoSave = (id: number, patch: Partial<PatchedWidgetConnectionRequest>) => {
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    if (debouncedPatchRef.current) clearTimeout(debouncedPatchRef.current);
    debouncedPatchRef.current = setTimeout(() => {
      void flushPendingPatch(id);
    }, 500);
  };

  // ── Explicit-save path for lists / messages ─────────────────────────────
  const savePatchNow = async (
    id: number,
    patch: Partial<PatchedWidgetConnectionRequest>,
  ) => {
    await updateMutation.mutateAsync({ id, data: patch });
  };

  // Loading
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>{t('loadError')}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty — show setup CTA
  if (!connections || connections.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{t('setupTitle')}</CardTitle>
              <CardDescription>{t('setupDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {createMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t('creating')}
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {t('createButton')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!selected) return null;

  const isActive = selected.is_active ?? true;

  return (
    <div className="space-y-6">
      {/* Header card — status + multi-widget selector */}
      <Card
        className={cn(
          'border-2',
          isActive ? 'border-indigo-200 bg-indigo-50/50' : 'border-border',
        )}
      >
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {selected.label || t('defaultLabel')}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {isActive ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{t('statusActive')}</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-muted-foreground" />
                      <span>{t('statusInactive')}</span>
                    </>
                  )}
                  {autoSaving && (
                    <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t('autoSaving')}
                    </span>
                  )}
                  {!autoSaving && showSavedToast && (
                    <span className="ml-2 text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {t('autoSaved')}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              {connections.length > 1 && (
                <Select
                  value={String(selected.id)}
                  onValueChange={(v) => setSelectedId(Number(v))}
                >
                  <SelectTrigger className="min-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.label || t('defaultLabel')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Badge
                variant={isActive ? 'default' : 'secondary'}
                className={cn(
                  'h-8 self-start sm:self-auto',
                  isActive && 'bg-indigo-600 hover:bg-indigo-700',
                )}
              >
                {isActive ? t('badgeActive') : t('badgeInactive')}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-md border bg-background p-3">
            <div>
              <Label htmlFor="widget_is_active" className="font-medium">
                {t('enableToggle')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('enableToggleHint')}</p>
            </div>
            <Switch
              id="widget_is_active"
              checked={isActive}
              onCheckedChange={(checked) => {
                scheduleAutoSave(selected.id, { is_active: checked });
              }}
            />
          </div>

          {/* Voice calls read-only teaser — actual editing happens in PR 9 */}
          <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/40 p-3 opacity-70">
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <Label htmlFor="widget_voice_enabled" className="font-medium">
                  {t('voiceCallsLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('voiceCallsComingSoon')}
                </p>
              </div>
            </div>
            <Switch
              id="widget_voice_enabled"
              checked={Boolean(selected.voice_enabled)}
              disabled
              aria-label={t('voiceCallsLabel')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Two-column: editor on the left, preview on the right */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <WidgetInstallCard widgetToken={selected.widget_token} />

          <WidgetAllowedOriginsEditor
            value={asStringArray(selected.allowed_origins)}
            saving={updateMutation.isPending}
            onSave={async (origins) => {
              await savePatchNow(selected.id, { allowed_origins: origins });
            }}
          />

          <WidgetAppearanceForm
            brandColor={selected.brand_color || '#2A2B7D'}
            position={asPosition(selected.position)}
            saving={autoSaving}
            onChange={({ brand_color, position }) => {
              // The generated `position` type is declared as `PositionEnum`
              // (an opaque index-signature interface from the OpenAPI
              // generator). The backend actually accepts the two string
              // literals, so we cast to the generated type shape.
              scheduleAutoSave(selected.id, {
                brand_color,
                position: position as unknown as PatchedWidgetConnectionRequest['position'],
              });
            }}
          />

          <WidgetMessagesEditor
            welcomeMessage={asLocaleText(selected.welcome_message)}
            offlineMessage={asLocaleText(selected.offline_message)}
            preChatForm={asPreChat(selected.pre_chat_form)}
            saving={updateMutation.isPending}
            onSave={async (payload) => {
              await savePatchNow(selected.id, payload);
            }}
          />
        </div>

        <div className="lg:block">
          <WidgetPreviewFrame widgetToken={selected.widget_token} />
        </div>
      </div>
    </div>
  );
}
