"use client"

import type { ChatActionType, ChatStateType, MessageType, ChatType } from "../types"

export const ChatReducer = (
  state: ChatStateType,
  action: ChatActionType
): ChatStateType => {
  switch (action.type) {
    case "addTextMessage": {
      if (!state.selectedChat) {
        return state // No selected chat, return the current state
      }

      const newMessage: MessageType = {
        id: crypto.randomUUID(), // Generate a unique ID for the message
        senderId: "1", // Assuming "1" represents the current user
        text: action.text, // Set the text content
        status: "DELIVERED", // Message delivery status
        createdAt: new Date(), // Set the current timestamp
      }

      const { id, messages } = state.selectedChat

      const updatedChat = {
        ...state.selectedChat,
        lastMessage: {
          content: action.text, // Update the last message content
          createdAt: newMessage.createdAt, // Update the timestamp
        },
        messages: [newMessage, ...messages], // Add the new message to the top
      }

      const updatedChats = state.chats.map(
        (chat) => (chat.id === id ? updatedChat : chat) // Update the relevant chat
      )

      return { ...state, chats: updatedChats }
    }

    case "addImagesMessage": {
      if (!state.selectedChat) {
        return state // No selected chat, return the current state
      }

      const newMessage: MessageType = {
        id: crypto.randomUUID(),
        senderId: "1",
        images: action.images, // Attach the images to the message
        status: "DELIVERED",
        createdAt: new Date(),
      }

      const { id, messages } = state.selectedChat

      const updatedChat = {
        ...state.selectedChat,
        lastMessage: {
          content: action.images.length > 1 ? "Images" : "Image", // Update the last message to reflect images
          createdAt: newMessage.createdAt,
        },
        messages: [newMessage, ...messages], // Add the new message
      }

      const updatedChats = state.chats.map(
        (chat) => (chat.id === id ? updatedChat : chat) // Update the relevant chat
      )

      return { ...state, chats: updatedChats }
    }

    case "addFilesMessage": {
      if (!state.selectedChat) {
        return state // No selected chat, return the current state
      }

      const newMessage: MessageType = {
        id: crypto.randomUUID(),
        senderId: "1",
        files: action.files, // Attach the files to the message
        status: "DELIVERED",
        createdAt: new Date(),
      }

      const { id, messages } = state.selectedChat

      const updatedChat = {
        ...state.selectedChat,
        lastMessage: {
          content: action.files.length > 1 ? "Files" : "File", // Update the last message to reflect files
          createdAt: newMessage.createdAt,
        },
        messages: [newMessage, ...messages], // Add the new message
      }

      const updatedChats = state.chats.map(
        (chat) => (chat.id === id ? updatedChat : chat) // Update the relevant chat
      )

      return { ...state, chats: updatedChats }
    }

    case "setUnreadCount": {
      if (!state.selectedChat) {
        return state // No selected chat, return the current state
      }

      const { id } = state.selectedChat

      const updatedChat = {
        ...state.selectedChat,
        unreadCount: 0, // Reset unread count for the selected chat
      }

      const updatedChats = state.chats.map(
        (chat) => (chat.id === id ? updatedChat : chat) // Update the relevant chat
      )

      return { ...state, chats: updatedChats }
    }

    case "selectChat": {
      return { ...state, selectedChat: action.chat } // Set the selected chat
    }

    case "updateChats": {
      // Update chats from external source (e.g., after reloading from API)
      // Preserve selectedChat if it still exists in the new chats
      const selectedChatId = state.selectedChat?.id
      const updatedSelectedChat = selectedChatId
        ? action.chats.find(chat => chat.id === selectedChatId) || null
        : null

      return {
        ...state,
        chats: action.chats,
        selectedChat: updatedSelectedChat
      }
    }

    case "updateChatMessages": {
      // Update messages for a specific chat (lazy loading)
      const updatedChats = state.chats.map(chat => {
        if (chat.id === action.chatId) {
          return {
            ...chat,
            messages: action.messages,
            messagesLoaded: true
          }
        }
        return chat
      })

      // Also update selectedChat if it's the same chat
      const updatedSelectedChat = state.selectedChat?.id === action.chatId
        ? { ...state.selectedChat, messages: action.messages, messagesLoaded: true }
        : state.selectedChat

      return {
        ...state,
        chats: updatedChats,
        selectedChat: updatedSelectedChat
      }
    }

    case "addIncomingMessage": {
      // Add a new incoming message to a specific chat
      const { chatId, message, senderName } = action
      const isSelectedChat = state.selectedChat?.id === chatId

      // Find the chat and update it
      let chatFound = false
      let updatedChats = state.chats.map(chat => {
        if (chat.id === chatId) {
          chatFound = true
          return {
            ...chat,
            messages: [message, ...chat.messages], // Add message to the beginning (newest first)
            lastMessage: {
              content: message.text || (message.images ? 'Image' : message.files ? 'File' : ''),
              createdAt: message.createdAt,
            },
            // Only increment unread count if this is not the currently selected chat
            unreadCount: isSelectedChat ? chat.unreadCount : (chat.unreadCount || 0) + 1,
          }
        }
        return chat
      })

      // If chat wasn't found in the list, create a new chat entry
      if (!chatFound) {
        const newChat: ChatType = {
          id: chatId,
          name: senderName || 'Unknown',
          messages: [message],
          lastMessage: {
            content: message.text || '',
            createdAt: message.createdAt,
          },
          users: [],
          typingUsers: [],
          unreadCount: 1,
          platform: message.platform,
          messagesLoaded: true,
        }
        updatedChats = [newChat, ...updatedChats]
      } else {
        // Move the updated chat to the top of the list
        const chatIndex = updatedChats.findIndex(c => c.id === chatId)
        if (chatIndex > 0) {
          const [chat] = updatedChats.splice(chatIndex, 1)
          updatedChats.unshift(chat)
        }
      }

      // Update selectedChat if it's the same chat
      const updatedSelectedChat = isSelectedChat && state.selectedChat
        ? {
            ...state.selectedChat,
            messages: [message, ...state.selectedChat.messages],
            lastMessage: {
              content: message.text || '',
              createdAt: message.createdAt,
            },
          }
        : state.selectedChat

      return {
        ...state,
        chats: updatedChats,
        selectedChat: updatedSelectedChat,
      }
    }

    default:
      return state // Return the current state for unknown actions
  }
}
