"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Send, ChevronDown, ChevronUp, X, Reply, Paperclip, FileText, Mic } from "lucide-react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"

import type { TextMessageFormType } from "@/components/chat/types"

import { TextMessageSchema } from "@/components/chat/schemas/text-message-schema"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useTypingWebSocket } from "@/hooks/useTypingWebSocket"
import { ButtonLoading, Button } from "@/components/ui/button"
import { EmojiPicker } from "@/components/ui/emoji-picker"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import axios from "@/api/axios"
import { toast } from "sonner"
import { QuickReplySelector } from "@/components/social/QuickReplySelector"
import { QuickReplyPlatform } from "@/hooks/api/useSocial"
import { useSendWhatsAppTemplateMessage } from "@/hooks/api/useSocial"
import { useAuth } from "@/contexts/AuthContext"
import TemplateSelector from "@/components/social/TemplateSelector"
import type { WhatsAppMessageTemplate } from "@/api/generated"
import { addPendingMedia } from "@/lib/pendingMedia"

interface TextMessageFormFacebookProps {
  onMessageSent?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TextMessageFormFacebook({ onMessageSent }: TextMessageFormFacebookProps) {
  const { chatState, replyingTo, setReplyingTo, reloadChatMessages } = useChatContext()
  const { user } = useAuth()
  const [isSending, setIsSending] = useState(false)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [ccEmails, setCcEmails] = useState("")
  const [bccEmails, setBccEmails] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if current chat is email
  const isEmailPlatform = chatState.selectedChat?.platform === 'email' ||
    chatState.selectedChat?.id?.startsWith('email_')

  // WhatsApp template support
  const isWhatsApp = chatState.selectedChat?.platform === 'whatsapp'
  const sendTemplate = useSendWhatsAppTemplateMessage()

  const handleTemplateSelect = async (
    template: WhatsAppMessageTemplate,
    parameters: Record<string, string>
  ) => {
    const selectedChat = chatState.selectedChat
    if (!selectedChat) return

    try {
      const recipientNumber = selectedChat.id.split("_")[2]
      const wabaId = selectedChat.id.split("_")[1]

      await sendTemplate.mutateAsync({
        waba_id: wabaId,
        template_id: template.id!,
        to_number: recipientNumber,
        parameters: parameters,
      })

      toast.success("Template message sent successfully")
    } catch (error: any) {
      console.error("Failed to send template message:", error)
      toast.error(error.response?.data?.error || "Failed to send template message")
    }
  }

  // Clear reply state when chat changes
  useEffect(() => {
    setReplyingTo(null)
    setAttachedFiles([])
  }, [chatState.selectedChat?.id, setReplyingTo])

  // Typing indicator WebSocket
  const { notifyTyping, sendTypingStop } = useTypingWebSocket({
    conversationId: chatState.selectedChat?.id,
  })

  const form = useForm<TextMessageFormType>({
    resolver: zodResolver(TextMessageSchema),
    defaultValues: {
      text: "",
    },
  })

  const text = form.watch("text")
  const { isSubmitting } = form.formState
  const hasContent = text.trim().length > 0 || attachedFiles.length > 0
  const isDisabled = isSubmitting || isSending || !hasContent

  // Generate preview URLs for image files, memoized to avoid re-creating on every render
  const previewUrls = useMemo(() => {
    return attachedFiles.map(file =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    )
  }, [attachedFiles])

  // Cleanup preview URLs on change
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => { if (url) URL.revokeObjectURL(url) })
    }
  }, [previewUrls])

  // Helper: send files for WhatsApp (one per API call since WA supports one media per message)
  const sendWhatsAppFiles = async (files: File[], phoneNumber: string, accountId: string, messageText: string) => {
    // Send first file with text caption, rest without
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData()
      formData.append('to_number', phoneNumber)
      formData.append('waba_id', accountId)
      formData.append('message', i === 0 ? messageText : '')
      formData.append('media', files[i])
      await axios.post('/api/social/whatsapp/send-message/', formData)
    }
    // If there were files but we still need to send text-only (no files scenario handled by caller)
  }

  // Helper: send files for Facebook
  const sendFacebookFiles = async (files: File[], recipientId: string, pageId: string, messageText: string, replyToMid?: string) => {
    // Send first file with text, rest without
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData()
      formData.append('recipient_id', recipientId)
      formData.append('page_id', pageId)
      formData.append('message', i === 0 ? messageText : '')
      if (i === 0 && replyToMid) {
        formData.append('reply_to_message_id', replyToMid)
      }
      formData.append('media', files[i])
      await axios.post('/api/social/facebook/send-message/', formData)
    }
  }

  const sendMessage = async (messageText: string) => {
    const selectedChat = chatState.selectedChat
    if (!selectedChat) return

    const chatIdParts = selectedChat.id.split('_')
    if (chatIdParts.length < 2) {
      throw new Error('Invalid chat ID format')
    }

    const platform = chatIdParts[0]
    const accountId = chatIdParts[1]
    const recipientId = chatIdParts.slice(2).join('_')
    const files = attachedFiles

    // Queue blob URLs for pending media so WebSocket handler can display them immediately
    if (files.length > 0) {
      for (const file of files) {
        const blobUrl = URL.createObjectURL(file)
        addPendingMedia(selectedChat.id, blobUrl, file.type.startsWith('image/'), file.name)
      }
    }

    if (platform === 'fb') {
      if (files.length > 0) {
        // If text only (no files), send text. If files, send via FormData.
        // If text + files, first file gets the text as caption
        await sendFacebookFiles(files, recipientId, accountId, messageText, replyingTo?.messageId)
        // If there's text but no file sent it with, send text separately
        if (messageText && files.length === 0) {
          await axios.post('/api/social/facebook/send-message/', {
            recipient_id: recipientId,
            message: messageText,
            page_id: accountId,
            reply_to_message_id: replyingTo?.messageId || '',
          })
        }
      } else {
        // Text only
        await axios.post('/api/social/facebook/send-message/', {
          recipient_id: recipientId,
          message: messageText,
          page_id: accountId,
          reply_to_message_id: replyingTo?.messageId || '',
        })
      }
    } else if (platform === 'ig') {
      await axios.post('/api/social/instagram/send-message/', {
        recipient_id: recipientId,
        message: messageText,
        instagram_account_id: accountId
      })
    } else if (platform === 'wa') {
      const phoneNumber = recipientId.startsWith('+') ? recipientId : `+${recipientId}`

      if (files.length > 0) {
        await sendWhatsAppFiles(files, phoneNumber, accountId, messageText)
        // If text + no files scenario — text already sent as caption with first file
      } else {
        // Text only
        await axios.post('/api/social/whatsapp/send-message/', {
          to_number: phoneNumber,
          message: messageText,
          waba_id: accountId,
        })
      }
    } else if (platform === 'email') {
      const connectionId = accountId
      const threadId = recipientId

      const threadMessagesResponse = await axios.get("/api/social/email-messages/", {
        params: { thread_id: threadId, connection_id: connectionId, page: 1 }
      })
      const messages = threadMessagesResponse.data?.results || []
      const latestMessage = messages.length > 0 ? messages[0] : null

      if (!latestMessage) {
        throw new Error('No message found to reply to')
      }

      let customerEmail: string | null = null
      if (!latestMessage.is_from_business) {
        customerEmail = latestMessage.from_email
      } else {
        const customerMessage = messages.find((m: any) => !m.is_from_business)
        if (customerMessage) {
          customerEmail = customerMessage.from_email
        } else {
          const businessMessage = messages.find((m: any) => m.is_from_business && m.to_emails?.length > 0)
          if (businessMessage?.to_emails?.[0]) {
            customerEmail = businessMessage.to_emails[0].email || businessMessage.to_emails[0]
          }
        }
      }

      if (!customerEmail) {
        throw new Error('Could not determine recipient email address')
      }

      const bodyHtml = `<p>${messageText.replace(/\n/g, '<br>')}</p>`

      const parseCcBccEmails = (input: string): string[] => {
        if (!input.trim()) return []
        return input.split(/[,;]/).map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'))
      }

      if (files.length > 0) {
        // Use FormData for email with attachments
        const formData = new FormData()
        // Append each email as a separate form field (DRF ListField expects this)
        formData.append('to_emails', customerEmail)
        for (const cc of parseCcBccEmails(ccEmails)) {
          formData.append('cc_emails', cc)
        }
        for (const bcc of parseCcBccEmails(bccEmails)) {
          formData.append('bcc_emails', bcc)
        }
        formData.append('subject', latestMessage.subject?.startsWith('Re:') ? latestMessage.subject : `Re: ${latestMessage.subject || '(No subject)'}`)
        formData.append('body_text', messageText)
        formData.append('body_html', bodyHtml)
        formData.append('reply_to_message_id', String(latestMessage.id))
        formData.append('connection_id', connectionId)
        for (const file of files) {
          formData.append('attachments', file)
        }
        await axios.post('/api/social/email/send/', formData)
      } else {
        // JSON for text-only email
        await axios.post('/api/social/email/send/', {
          to_emails: [customerEmail],
          cc_emails: parseCcBccEmails(ccEmails),
          bcc_emails: parseCcBccEmails(bccEmails),
          subject: latestMessage.subject?.startsWith('Re:') ? latestMessage.subject : `Re: ${latestMessage.subject || '(No subject)'}`,
          body_text: messageText,
          body_html: bodyHtml,
          reply_to_message_id: latestMessage.id,
          connection_id: connectionId,
        })
      }

      setCcEmails("")
      setBccEmails("")
      setShowCcBcc(false)

      if (reloadChatMessages) {
        reloadChatMessages(selectedChat.id)
      }
    } else {
      throw new Error('Unsupported platform: ' + platform)
    }
  }

  const onSubmit = async (data: TextMessageFormType) => {
    if (!chatState.selectedChat) return
    setIsSending(true)
    try {
      await sendMessage(data.text)
      form.reset()
      setReplyingTo(null)
      setAttachedFiles([])

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      sendTypingStop()
      if (onMessageSent) {
        onMessageSent()
      }
    } catch (error: any) {
      console.error("Failed to send message:", error)
      const errorCode = error?.response?.data?.error_code
      if (errorCode === 'window_expired') {
        toast.error("24-hour messaging window expired", {
          description: error?.response?.data?.details || "You can only reply within 24 hours of the customer's last message.",
        })
      } else if (errorCode === 'no_conversation') {
        toast.error("Cannot send message", {
          description: "The customer must message you first before you can reply.",
        })
      } else {
        toast.error("Failed to send message", {
          description: "There was an error sending your message. Please try again.",
        })
      }
    } finally {
      setIsSending(false)
    }
  }

  // Handle sending files-only (no text)
  const handleSendFilesOnly = async () => {
    if (attachedFiles.length === 0 || !chatState.selectedChat) return
    setIsSending(true)
    try {
      await sendMessage('')
      form.reset()
      setReplyingTo(null)
      setAttachedFiles([])

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      sendTypingStop()
      if (onMessageSent) {
        onMessageSent()
      }
    } catch (error: any) {
      console.error("Failed to send files:", error)
      toast.error("Failed to send files", {
        description: "There was an error sending your files. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  // Handle typing notification
  const handleInputChange = (value: string) => {
    if (value.length > 0) {
      notifyTyping()
    }
    requestAnimationFrame(autoResize)
  }

  // Handle paste - detect images/files from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) files.push(file)
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      setAttachedFiles(prev => [...prev, ...files])
    }
  }, [])

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setAttachedFiles(prev => [...prev, ...Array.from(files)])
    // Reset input so the same file can be selected again
    e.target.value = ''
  }, [])

  // Remove an attached file
  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Get platform for quick reply filtering
  const getPlatform = (): QuickReplyPlatform => {
    const selectedChat = chatState.selectedChat
    if (!selectedChat) return 'all'
    return (selectedChat.platform as QuickReplyPlatform) || 'all'
  }

  // Handle quick reply selection
  const handleQuickReplySelect = (message: string) => {
    form.setValue("text", message)
    form.trigger()
  }

  return (
    <Form {...form}>
      <div className="w-full space-y-2">
        {/* Reply preview */}
        {replyingTo && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border-l-2 border-primary">
            <Reply className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Replying to {replyingTo.senderName}
              </p>
              {replyingTo.text && (
                <p className="text-sm text-muted-foreground truncate">
                  {replyingTo.text}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* CC/BCC fields for email */}
        {isEmailPlatform && (
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowCcBcc(!showCcBcc)}
            >
              {showCcBcc ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showCcBcc ? "Hide CC/BCC" : "Add CC/BCC"}
            </Button>

            {showCcBcc && (
              <div className="space-y-2 px-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-8">CC:</label>
                  <Input
                    type="text"
                    placeholder="email@example.com, another@example.com"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    className="h-7 text-sm bg-muted"
                    disabled={isSending}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-8">BCC:</label>
                  <Input
                    type="text"
                    placeholder="email@example.com, another@example.com"
                    value={bccEmails}
                    onChange={(e) => setBccEmails(e.target.value)}
                    className="h-7 text-sm bg-muted"
                    disabled={isSending}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {attachedFiles.map((file, index) => (
              <div key={index} className="relative group">
                {file.type.startsWith('image/') ? (
                  <img
                    src={previewUrls[index] || ''}
                    alt="Attached"
                    className="h-16 w-16 object-cover rounded-md border"
                  />
                ) : (
                  <div className="h-16 px-3 flex items-center gap-2 rounded-md border bg-muted/50">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[120px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Message input */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex items-center gap-1.5"
        >
          <QuickReplySelector
            platform={getPlatform()}
            onSelect={handleQuickReplySelect}
            customerName={chatState.selectedChat?.name}
            agentName={user?.first_name || user?.email}
          />
          <EmojiPicker
            onEmojiClick={(e) => {
              form.setValue("text", text + e.emoji)
              form.trigger()
              requestAnimationFrame(autoResize)
            }}
          />

          {/* Paperclip attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* WhatsApp template selector */}
          {isWhatsApp && (
            <TemplateSelector
              onSelect={handleTemplateSelect}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  aria-label="Send a template message"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              }
            />
          )}

          {/* Mic button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            aria-label="Send a voice message"
          >
            <Mic className="h-4 w-4" />
          </Button>

          <FormField
            control={form.control}
            name="text"
            render={({ field: { ref: fieldRef, ...field } }) => (
              <FormItem className="grow space-y-0">
                <FormLabel className="sr-only">Type a message</FormLabel>
                <FormControl>
                  <Textarea
                    ref={(el) => {
                      fieldRef(el)
                      ;(textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
                    }}
                    placeholder="Type a message..."
                    autoComplete="off"
                    className="bg-muted min-h-[36px] max-h-[120px] py-2 resize-none"
                    rows={1}
                    disabled={isSending}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      handleInputChange(e.target.value)
                    }}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (text.trim()) {
                          form.handleSubmit(onSubmit)()
                        } else if (attachedFiles.length > 0) {
                          handleSendFilesOnly()
                        }
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <ButtonLoading
            isLoading={isSending}
            disabled={isDisabled}
            size="icon"
            icon={Send}
            iconClassName="me-0"
            loadingIconClassName="me-0"
            onClick={() => {
              if (attachedFiles.length > 0 && !text.trim()) {
                handleSendFilesOnly()
              }
            }}
          />
        </form>
      </div>
    </Form>
  )
}
