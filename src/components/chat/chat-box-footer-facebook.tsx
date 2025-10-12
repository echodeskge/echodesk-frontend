"use client"

import { CardFooter } from "@/components/ui/card"
import { ChatBoxFooterActions } from "./chat-box-footer-actions"
import { TextMessageFormFacebook } from "./text-message-form-facebook"

interface ChatBoxFooterFacebookProps {
  onMessageSent?: () => void;
}

export function ChatBoxFooterFacebook({ onMessageSent }: ChatBoxFooterFacebookProps) {
  return (
    <CardFooter className="py-3 border-t border-border">
      <ChatBoxFooterActions />
      <TextMessageFormFacebook onMessageSent={onMessageSent} />
    </CardFooter>
  )
}
