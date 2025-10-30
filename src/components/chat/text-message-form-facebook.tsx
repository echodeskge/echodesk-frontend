"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Send } from "lucide-react"
import { useState } from "react"

import type { TextMessageFormType } from "@/components/chat/types"

import { TextMessageSchema } from "@/components/chat/schemas/text-message-schema"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
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
import { apiSocialFacebookSendMessageCreate } from "@/api/generated/api"
import { toast } from "sonner"

interface TextMessageFormFacebookProps {
  onMessageSent?: () => void;
}

export function TextMessageFormFacebook({ onMessageSent }: TextMessageFormFacebookProps) {
  const { chatState } = useChatContext()
  const [isSending, setIsSending] = useState(false)

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
      // Format: fb_{pageId}_{senderId}
      const chatIdParts = selectedChat.id.split('_')
      if (chatIdParts.length !== 3 || chatIdParts[0] !== 'fb') {
        throw new Error('Invalid chat ID format')
      }

      const pageId = chatIdParts[1]
      const recipientId = chatIdParts[2]

      // Send via Facebook API
      await apiSocialFacebookSendMessageCreate({
        recipient_id: recipientId,
        message: data.text,
        page_id: pageId
      })

      // Reset form
      form.reset()

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
