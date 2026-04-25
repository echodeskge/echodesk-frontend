"use client";

import { type KeyboardEvent, useRef, useState } from 'react';
import { Paperclip, Send, X, Loader2 } from 'lucide-react';

import { uploadAttachment, type WidgetUploadResponse, WidgetApiError } from './widget-api';

interface ComposerProps {
  brandColor: string;
  disabled?: boolean;
  isSending?: boolean;
  // The widget-api upload endpoint needs the visitor's token + session_id, so
  // the composer takes a factory that returns them when the user picks a file
  // (session_id may be created lazily on first send, so we can't capture it
  // at mount time).
  getUploadContext?: () => { token: string; session_id: string | null };
  onSend: (text: string, attachments?: WidgetUploadResponse[]) => Promise<void> | void;
}

// Limits must match the backend (widget_views.WIDGET_UPLOAD_MAX_BYTES etc.).
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function Composer({
  brandColor,
  disabled,
  isSending,
  getUploadContext,
  onSend,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<WidgetUploadResponse[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const fireSendPulse = () => {
    const btn = sendButtonRef.current;
    if (!btn) return;
    btn.classList.remove('echodesk-send-firing');
    // Force reflow so the animation re-triggers when send is hit twice
    void btn.offsetWidth;
    btn.classList.add('echodesk-send-firing');
  };

  const submit = async () => {
    const value = text.trim();
    if (isSending) return;
    if (!value && attachments.length === 0) return;
    fireSendPulse();
    setText('');
    const sent = attachments;
    setAttachments([]);
    await onSend(value, sent.length > 0 ? sent : undefined);
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!getUploadContext) {
      setUploadError('Uploads are not available yet — try again in a moment.');
      return;
    }
    const ctx = getUploadContext();
    if (!ctx.session_id) {
      setUploadError('Send your first message before attaching a file.');
      return;
    }
    setUploadError(null);
    const list = Array.from(files);
    for (const file of list) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`"${file.name}" is larger than 10 MB.`);
        continue;
      }
      setUploadingCount((c) => c + 1);
      try {
        const res = await uploadAttachment({
          token: ctx.token,
          session_id: ctx.session_id!,
          file,
        });
        setAttachments((prev) => [...prev, res]);
      } catch (err) {
        const code = err instanceof WidgetApiError ? err.code : undefined;
        if (code === 'file_too_large') {
          setUploadError(`"${file.name}" is larger than 10 MB.`);
        } else if (code === 'unsupported_type') {
          setUploadError(`"${file.name}" has an unsupported file type.`);
        } else {
          setUploadError('Upload failed. Please try again.');
        }
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
    // Reset the picker so the same file can be re-selected after removal.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const hasContent = text.trim().length > 0 || attachments.length > 0;
  const sendDisabled =
    Boolean(disabled) || !hasContent || Boolean(isSending) || uploadingCount > 0;

  return (
    <div
      style={{
        borderTop: '1px solid #e5e7eb',
        padding: '10px 10px 12px',
        background: '#ffffff',
      }}
    >
      {attachments.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 8,
          }}
        >
          {attachments.map((att, idx) => (
            <span
              key={att.url}
              className="echodesk-attachment-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '4px 6px 4px 8px',
                fontSize: 12,
                color: '#374151',
                maxWidth: '100%',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                }}
                title={att.filename}
              >
                {att.filename}
              </span>
              <button
                type="button"
                aria-label={`Remove ${att.filename}`}
                onClick={() => removeAttachment(idx)}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'inline-flex',
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {uploadError && (
        <div
          role="status"
          style={{
            marginBottom: 6,
            fontSize: 11,
            color: '#b91c1c',
          }}
        >
          {uploadError}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '6px 6px 6px 10px',
          background: '#f9fafb',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => void handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          aria-label="Attach file"
          title="Attach file (max 10 MB)"
          onClick={() => fileInputRef.current?.click()}
          disabled={Boolean(disabled) || uploadingCount > 0}
          style={{
            background: 'transparent',
            border: 0,
            color: uploadingCount > 0 ? '#9ca3af' : '#4b5563',
            cursor: uploadingCount > 0 ? 'wait' : 'pointer',
            padding: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {uploadingCount > 0 ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          style={{
            flex: 1,
            resize: 'none',
            border: 0,
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            lineHeight: 1.4,
            padding: '6px 4px',
            fontFamily: 'inherit',
            color: '#111827',
            maxHeight: 120,
          }}
        />
        <button
          ref={sendButtonRef}
          type="button"
          onClick={() => void submit()}
          disabled={sendDisabled}
          aria-label="Send message"
          style={{
            background: sendDisabled ? '#d1d5db' : brandColor,
            color: '#ffffff',
            border: 0,
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: sendDisabled ? 'not-allowed' : 'pointer',
            transition: 'background .12s ease, transform .12s ease',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
