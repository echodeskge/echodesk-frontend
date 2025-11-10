"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Send } from "lucide-react"
import { useState, useEffect } from "react"

import type { TextMessageFormType } from "@/components/chat/types"

import { TextMessageSchema } from "@/components/chat/schemas/text-message-schema"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useTypingWebSocket } from "@/hooks/useTypingWebSocket"
import { ButtonLoading } from "@/components/ui/button"
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

interface TextMessageFormFacebookProps {
  onMessageSent?: () => void;
}

interface WhatsAppSendMessagePayload {
  to_number: string;
  message: string;
  waba_id: string;
}

export function TextMessageFormFacebook({ onMessageSent }: TextMessageFormFacebookProps) {
  const { chatState } = useChatContext()
  const [isSending, setIsSending] = useState(false)

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
      // Format: fb_{pageId}_{senderId} or ig_{accountId}_{senderId}
      const chatIdParts = selectedChat.id.split('_')
      if (chatIdParts.length !== 3) {
        throw new Error('Invalid chat ID format')
      }

      const platform = chatIdParts[0]
      const accountId = chatIdParts[1]
      const recipientId = chatIdParts[2]

      if (platform === 'fb') {
        // Send via Facebook API
        await socialFacebookSendMessageCreate({
          recipient_id: recipientId,
          message: data.text,
          page_id: accountId
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
        const payload: WhatsAppSendMessagePayload = {
          to_number: recipientId,
          message: data.text,
          waba_id: accountId
        }
        await axios.post('/api/social/whatsapp/send-message/', payload)
      } else {
        throw new Error('Unsupported platform: ' + platform)
      }

      // Reset form
      form.reset()

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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex justify-center items-center gap-1.5"
      >
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
                  className="bg-accent"
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
    </Form>
  )
}
