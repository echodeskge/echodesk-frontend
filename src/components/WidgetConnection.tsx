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
} from 'lucide-react';
import {
  ActionButton,
  ChannelDetailCard,
  SettingsNote,
  SettingsToggle,
} from '@/components/redesign/settings';
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
import { WidgetProactiveSection } from '@/components/widget-settings/WidgetProactiveSection';

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
      <div className="flex items-center justify-center rounded-[10px] border bg-card py-12" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <SettingsNote
        tone="danger"
        icon={AlertCircle}
        testId="widget-load-error"
        action={
          <ActionButton icon={RefreshCw} onClick={() => refetch()}>
            {t('retry')}
          </ActionButton>
        }
      >
        {t('loadError')}
      </SettingsNote>
    );
  }

  // Empty — show setup CTA
  if (!connections || connections.length === 0) {
    return (
      <ChannelDetailCard
        icon={MessageCircle}
        color="#4f46e5"
        title={t('setupTitle')}
        status={t('setupDescription')}
        actions={[
          {
            label: createMutation.isPending ? t('creating') : t('createButton'),
            icon: createMutation.isPending ? RefreshCw : Plus,
            variant: 'primary',
            onClick: handleCreate,
            disabled: createMutation.isPending,
            testId: 'widget-create',
          },
        ]}
        testId="widget-setup"
      />
    );
  }

  if (!selected) return null;

  const isActive = selected.is_active ?? true;

  return (
    <>
      {/* Header card — status + multi-widget selector */}
      <ChannelDetailCard
        icon={MessageCircle}
        color="#4f46e5"
        title={selected.label || t('defaultLabel')}
        status={
          <>
            {isActive ? t('statusActive') : t('statusInactive')}
            {autoSaving && (
              <span className="ms-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                {t('autoSaving')}
              </span>
            )}
            {!autoSaving && showSavedToast && (
              <span className="ms-2 inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                <Check className="h-3 w-3" aria-hidden />
                {t('autoSaved')}
              </span>
            )}
          </>
        }
        statusIcon={isActive ? Check : X}
        statusTone={isActive ? 'success' : 'neutral'}
        badge={{ label: isActive ? t('badgeActive') : t('badgeInactive'), tone: isActive ? 'success' : 'neutral' }}
        testId="widget-detail"
      >
        {connections.length > 1 && (
          <Select
            value={String(selected.id)}
            onValueChange={(v) => setSelectedId(Number(v))}
          >
            <SelectTrigger className="h-[34px] w-full text-[13px] sm:w-[260px]" aria-label={t('defaultLabel')}>
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
        <div className="flex items-center justify-between gap-4 rounded-lg border px-3.5 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <label htmlFor="widget_is_active" className="text-[13px] font-medium">
              {t('enableToggle')}
            </label>
            <span className="text-xs leading-[17px] text-muted-foreground">{t('enableToggleHint')}</span>
          </div>
          <SettingsToggle
            id="widget_is_active"
            checked={isActive}
            onCheckedChange={(checked) => {
              scheduleAutoSave(selected.id, { is_active: checked });
            }}
          />
        </div>
      </ChannelDetailCard>

      <WidgetProactiveSection
        enabled={Boolean((selected as unknown as Record<string, unknown>).proactive_enabled)}
        message={asLocaleText((selected as unknown as Record<string, unknown>).proactive_message)}
        delaySeconds={Number((selected as unknown as Record<string, unknown>).proactive_delay_seconds) || 30}
        saving={autoSaving || updateMutation.isPending}
        onToggle={(v) =>
          scheduleAutoSave(
            selected.id,
            { proactive_enabled: v } as unknown as Partial<PatchedWidgetConnectionRequest>,
          )
        }
        onSave={async (payload) => {
          await savePatchNow(
            selected.id,
            payload as unknown as Partial<PatchedWidgetConnectionRequest>,
          );
        }}
      />

      {/* Editors, then the live preview (one column: the channel detail is too narrow for two). */}
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex min-w-0 flex-col gap-3.5">
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

        <div className="min-w-0">
          <WidgetPreviewFrame widgetToken={selected.widget_token} />
        </div>
      </div>
    </>
  );
}
