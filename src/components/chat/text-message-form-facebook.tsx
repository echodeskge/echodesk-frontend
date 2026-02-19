"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Send, ChevronDown, ChevronUp, X, Reply } from "lucide-react"
import { useState, useEffect } from "react"

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
import { socialFacebookSendMessageCreate } from "@/api/generated/api"
import axios from "@/api/axios"
import { toast } from "sonner"
import { QuickReplySelector } from "@/components/social/QuickReplySelector"
import { QuickReplyPlatform } from "@/hooks/api/useSocial"
import { useAuth } from "@/contexts/AuthContext"

interface TextMessageFormFacebookProps {
  onMessageSent?: () => void;
}

interface WhatsAppSendMessagePayload {
  to_number: string;
  message: string;
  waba_id: string;
}

export function TextMessageFormFacebook({ onMessageSent }: TextMessageFormFacebookProps) {
  const { chatState, replyingTo, setReplyingTo } = useChatContext()
  const { user } = useAuth()
  const [isSending, setIsSending] = useState(false)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [ccEmails, setCcEmails] = useState("")
  const [bccEmails, setBccEmails] = useState("")

  // Check if current chat is email
  const isEmailPlatform = chatState.selectedChat?.platform === 'email' ||
    chatState.selectedChat?.id?.startsWith('email_')

  // Clear reply state when chat changes
  useEffect(() => {
    setReplyingTo(null)
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
  const { isSubmitting, isValid } = form.formState
  const isDisabled = isSubmitting || !isValid || isSending

  const onSubmit = async (data: TextMessageFormType) => {
    const selectedChat = chatState.selectedChat
    if (!selectedChat) return

    setIsSending(true)
    try {
      // Extract conversation details from chat ID
      // Format: fb_{pageId}_{senderId}, ig_{accountId}_{senderId}, wa_{wabaId}_{number}, or email_{threadId}
      const chatIdParts = selectedChat.id.split('_')
      if (chatIdParts.length < 2) {
        throw new Error('Invalid chat ID format')
      }

      const platform = chatIdParts[0]
      // For email, we only have 2 parts; for others we have 3+
      const accountId = chatIdParts[1]
      const recipientId = chatIdParts.slice(2).join('_') // Handle IDs with underscores

      if (platform === 'fb') {
        // Send via Facebook API
        await socialFacebookSendMessageCreate({
          recipient_id: recipientId,
          message: data.text,
          page_id: accountId,
          reply_to_message_id: replyingTo?.messageId || '',
        })
      } else if (platform === 'ig') {
        // Send via Instagram API
        await axios.post('/api/social/instagram/send-message/', {
          recipient_id: recipientId,
          message: data.text,
          instagram_account_id: accountId
        })
      } else if (platform === 'wa') {
        // Send via WhatsApp API
        // Ensure phone number has + prefix for E.164 format
        const phoneNumber = recipientId.startsWith('+') ? recipientId : `+${recipientId}`
        const payload: WhatsAppSendMessagePayload = {
          to_number: phoneNumber,
          message: data.text,
          waba_id: accountId
        }
        await axios.post('/api/social/whatsapp/send-message/', payload)
      } else if (platform === 'email') {
        // For email, the ID format is email_{threadId}
        // We need to get the thread messages to find recipient and latest message
        const threadId = selectedChat.id.replace('email_', '')
        const threadMessagesResponse = await axios.get("/api/social/email-messages/", {
          params: { thread_id: threadId, page: 1 }
        })
        const messages = threadMessagesResponse.data?.results || []
        const latestMessage = messages.length > 0 ? messages[0] : null

        if (!latestMessage) {
          throw new Error('No message found to reply to')
        }

        // Get connection_id from the thread messages to send from the correct account
        const connectionId = latestMessage.connection_id

        // Find customer email - look for a message NOT from business
        // If latest is from customer, use their email; otherwise find first customer message
        let customerEmail: string | null = null
        if (!latestMessage.is_from_business) {
          customerEmail = latestMessage.from_email
        } else {
          // Find a message from the customer in the thread
          const customerMessage = messages.find((m: any) => !m.is_from_business)
          if (customerMessage) {
            customerEmail = customerMessage.from_email
          } else {
            // Fallback: if all messages are from business, check to_emails of our sent messages
            const businessMessage = messages.find((m: any) => m.is_from_business && m.to_emails?.length > 0)
            if (businessMessage?.to_emails?.[0]) {
              customerEmail = businessMessage.to_emails[0].email || businessMessage.to_emails[0]
            }
          }
        }

        if (!customerEmail) {
          throw new Error('Could not determine recipient email address')
        }

        // Send email reply - convert plain text to HTML for proper signature rendering
        const bodyHtml = `<p>${data.text.replace(/\n/g, '<br>')}</p>`;

        // Parse CC and BCC emails (comma or semicolon separated)
        const parseCcBccEmails = (input: string): string[] => {
          if (!input.trim()) return [];
          return input
            .split(/[,;]/)
            .map(email => email.trim())
            .filter(email => email.length > 0 && email.includes('@'));
        };

        await axios.post('/api/social/email/send/', {
          to_emails: [customerEmail],
          cc_emails: parseCcBccEmails(ccEmails),
          bcc_emails: parseCcBccEmails(bccEmails),
          subject: latestMessage.subject?.startsWith('Re:') ? latestMessage.subject : `Re: ${latestMessage.subject || '(No subject)'}`,
          body_text: data.text,
          body_html: bodyHtml,
          reply_to_message_id: latestMessage.id,
          connection_id: connectionId,  // Send from the same account that received the email
        })

        // Clear CC/BCC after sending
        setCcEmails("");
        setBccEmails("");
        setShowCcBcc(false);
      } else {
        throw new Error('Unsupported platform: ' + platform)
      }

      // Reset form and clear reply state
      form.reset()
      setReplyingTo(null)

      // Stop typing indicator after sending
      sendTypingStop()

      // Reload messages to show the sent message
      if (onMessageSent) {
        onMessageSent()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      toast.error("Failed to send message", {
        description: "There was an error sending your message. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Handle typing notification
  const handleInputChange = (value: string) => {
    if (value.length > 0) {
      notifyTyping()
    }
  }

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

        {/* Message input */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex justify-center items-center gap-1.5"
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
            }}
          />

          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="grow space-y-0">
                <FormLabel className="sr-only">Type a message</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    autoComplete="off"
                    className="bg-muted"
                    disabled={isSending}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      handleInputChange(e.target.value)
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
          />
        </form>
      </div>
    </Form>
  )
}
