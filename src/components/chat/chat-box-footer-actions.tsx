"use client"

import { useMedia } from "react-use"
import { useParams } from "next/navigation"
import { useMemo } from "react"
import { ChevronRight, CirclePlus, Mic, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FilesUploader } from "./files-uploader"
import { ImagesUploader } from "./images-uploader"
import { useChatContext } from "./hooks/use-chat-context"
import TemplateSelector from "@/components/social/TemplateSelector"
import { WhatsAppMessageTemplate } from "@/api/generated"
import { useSendWhatsAppTemplateMessage } from "@/hooks/api/useSocial"
import { toast } from "sonner"

export function ChatBoxFooterActions() {
  const isMobile = useMedia("(max-width: 480px)")
  const { chatState } = useChatContext()
  const params = useParams()

  const chatIdParam = params.id?.[0]
  const chat = useMemo(() => {
    if (chatIdParam) {
      return chatState.chats.find((c) => c.id === chatIdParam)
    }
    return null
  }, [chatState.chats, chatIdParam])

  const isWhatsApp = chat?.platform === "whatsapp"
  const sendTemplate = useSendWhatsAppTemplateMessage()

  const handleTemplateSelect = async (
    template: WhatsAppMessageTemplate,
    parameters: Record<string, string>
  ) => {
    if (!chat) return

    try {
      // Extract recipient phone number from chat
      // The chat.id format is "wa_{waba_id}_{phone_number}"
      const recipientNumber = chat.id.split("_")[2]
      const wabaId = chat.id.split("_")[1]

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

  return isMobile ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="More actions"
        >
          <CirclePlus className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        className="flex justify-between gap-1.5 min-w-fit"
      >
        <DropdownMenuItem asChild>
          <ImagesUploader />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <FilesUploader />
        </DropdownMenuItem>
        {isWhatsApp && (
          <DropdownMenuItem asChild>
            <TemplateSelector
              onSelect={handleTemplateSelect}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Send a template message"
                >
                  <FileText className="size-4" />
                </Button>
              }
            />
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Send a voice message"
          >
            <Mic className="size-4" />
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Collapsible className="flex whitespace-nowrap overflow-x-clip">
      <CollapsibleTrigger
        className="[&[data-state=open]>svg]:rotate-180"
        asChild
      >
        <Button variant="ghost" size="icon" aria-label="More actions">
          <ChevronRight className="size-4 transition-transform duration-200 rtl:-scale-100" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-left data-[state=open]:animate-collapsible-right duration-1000">
        <ImagesUploader />
        <FilesUploader />
        {isWhatsApp && (
          <TemplateSelector
            onSelect={handleTemplateSelect}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Send a template message"
              >
                <FileText className="size-4" />
              </Button>
            }
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Send a voice message"
        >
          <Mic className="size-4" />
        </Button>
      </CollapsibleContent>
    </Collapsible>
  )
}
