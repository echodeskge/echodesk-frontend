'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Minus, Send, Paperclip, Mic, FileIcon, Image as ImageIcon, StopCircle, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { LAYOUT, useFloatingChat, type OpenChat } from './FloatingChatContext';
import type { TeamChatMessage } from './types';

interface FloatingChatWindowProps {
  chat: OpenChat;
  index: number; // Position index (0 = rightmost, 1 = next to right, etc.)
  currentUserId: number;
  isOnline: boolean;
  typingUser: string | null;
  onSendMessage: (
    userId: number,
    text: string,
    file?: File,
    messageType?: string,
    voiceDuration?: number
  ) => void;
  onTyping: (userId: number, isTyping: boolean) => void;
  onClearHistory?: (conversationId: number) => void;
  isClearingHistory?: boolean;
}

export function FloatingChatWindow({
  chat,
  index,
  currentUserId,
  isOnline,
  typingUser,
  onSendMessage,
  onTyping,
  onClearHistory,
  isClearingHistory,
}: FloatingChatWindowProps) {
  const { minimizeChat, closeChat } = useFloatingChat();
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chat.messages.length > 0) {
      // Instant scroll on initial load, smooth scroll for new messages
      messagesEndRef.current?.scrollIntoView({
        behavior: isInitialLoadRef.current ? 'instant' : 'smooth'
      });
      isInitialLoadRef.current = false;
    }
  }, [chat.messages]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Handle typing indicator
    onTyping(chat.user.id, true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(chat.user.id, false);
    }, 2000);
  };

  const handleSend = () => {
    if (!inputValue.trim() && !selectedFile) return;

    if (selectedFile) {
      const messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
      onSendMessage(chat.user.id, inputValue, selectedFile, messageType);
      setSelectedFile(null);
    } else {
      onSendMessage(chat.user.id, inputValue);
    }

    setInputValue('');
    onTyping(chat.user.id, false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        onSendMessage(chat.user.id, '', file, 'voice', recordingDuration);
        setRecordingDuration(0);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      audioChunksRef.current = [];
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const conversationId = chat.conversation?.id;

  const handleClearHistory = () => {
    if (conversationId && onClearHistory) {
      onClearHistory(conversationId);
      setShowClearHistoryDialog(false);
    }
  };

  // Calculate position from right (index 0 = rightmost)
  const rightPosition =
    LAYOUT.MAIN_ICON.right +
    LAYOUT.MAIN_ICON.size +
    LAYOUT.WINDOW.gap +
    index * (LAYOUT.WINDOW.width + LAYOUT.WINDOW.gap);

  return (
    <Card
      className={cn(
        'fixed shadow-2xl flex flex-col overflow-hidden',
        'animate-in slide-in-from-bottom-4 fade-in duration-200'
      )}
      style={{
        right: rightPosition,
        bottom: LAYOUT.MAIN_ICON.bottom,
        width: LAYOUT.WINDOW.width,
        height: LAYOUT.WINDOW.height,
        zIndex: LAYOUT.Z_INDEX.window,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b bg-primary text-primary-foreground shrink-0">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
              {getInitials(chat.user.full_name)}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{chat.user.full_name}</div>
          <div className="text-[10px] text-primary-foreground/70">
            {typingUser ? 'typing...' : isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        {conversationId && onClearHistory && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowClearHistoryDialog(true)}
                disabled={isClearingHistory}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isClearingHistory ? 'Clearing...' : 'Clear History'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => minimizeChat(chat.id)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => closeChat(chat.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Clear History Confirmation Dialog */}
      <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all messages in this conversation with {chat.user.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingHistory}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              disabled={isClearingHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearingHistory ? 'Clearing...' : 'Clear History'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages */}
      <ScrollArea className="flex-1 p-2">
        <div className="flex flex-col gap-2">
          {chat.messages.map((message) => {
            const isCurrentUser = message.sender.id === currentUserId;

            return (
              <div
                key={message.id}
                className={cn('flex gap-1.5', isCurrentUser && 'flex-row-reverse')}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback
                    className={cn(
                      'text-[10px]',
                      isCurrentUser ? 'bg-primary/10 text-primary' : 'bg-secondary'
                    )}
                  >
                    {getInitials(message.sender.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-2 py-1.5',
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.message_type === 'image' && message.file_url && (
                    <img
                      src={message.file_url}
                      alt="Image"
                      className="rounded max-w-full max-h-32 mb-1"
                    />
                  )}
                  {message.message_type === 'file' && message.file_url && (
                    <a
                      href={message.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs underline mb-1"
                    >
                      <FileIcon className="h-3 w-3" />
                      {message.file_name || 'Download'}
                    </a>
                  )}
                  {message.message_type === 'voice' && message.file_url && (
                    <audio controls className="max-w-full h-8">
                      <source src={message.file_url} type="audio/webm" />
                    </audio>
                  )}
                  {message.text && (
                    <p className="text-xs whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  )}
                  <div
                    className={cn(
                      'text-[9px] mt-0.5',
                      isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {formatTime(message.created_at)}
                    {isCurrentUser && (
                      <span className="ml-1">{message.is_read ? '✓✓' : '✓'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="px-2 py-1 border-t bg-muted/50 flex items-center gap-1 shrink-0">
          {selectedFile.type.startsWith('image/') ? (
            <ImageIcon className="h-3 w-3 text-muted-foreground" />
          ) : (
            <FileIcon className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-xs truncate flex-1">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-2 border-t bg-background shrink-0">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelRecording}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
            <div className="flex-1 flex items-center gap-1">
              <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium">{formatDuration(recordingDuration)}</span>
            </div>
            <Button variant="default" size="icon" className="h-7 w-7" onClick={stopRecording}>
              <StopCircle className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startRecording}>
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Message..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="flex-1 h-7 text-xs"
            />
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={handleSend}
              disabled={!inputValue.trim() && !selectedFile}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
