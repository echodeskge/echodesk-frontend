'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Paperclip, Mic, X, FileIcon, Image as ImageIcon, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { TeamChatUser, TeamChatMessage, TeamChatConversation } from './types';

interface ChatWindowProps {
  conversation: TeamChatConversation | null;
  recipient: TeamChatUser;
  messages: TeamChatMessage[];
  currentUserId: number;
  isOnline: boolean;
  typingUser: string | null;
  onBack: () => void;
  onSendMessage: (text: string, file?: File, messageType?: string, voiceDuration?: number) => void;
  onTyping: (isTyping: boolean) => void;
}

export function ChatWindow({
  conversation,
  recipient,
  messages,
  currentUserId,
  isOnline,
  typingUser,
  onBack,
  onSendMessage,
  onTyping,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    onTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (!inputValue.trim() && !selectedFile) return;

    if (selectedFile) {
      const messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
      onSendMessage(inputValue, selectedFile, messageType);
      setSelectedFile(null);
    } else {
      onSendMessage(inputValue);
    }

    setInputValue('');
    onTyping(false);
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
        onSendMessage('', file, 'voice', recordingDuration);
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(recipient.full_name)}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{recipient.full_name}</div>
          <div className="text-xs text-muted-foreground">
            {typingUser ? (
              <span className="text-primary">typing...</span>
            ) : isOnline ? (
              'Online'
            ) : (
              'Offline'
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-3">
          {messages.map((message) => {
            const isCurrentUser = message.sender.id === currentUserId;

            return (
              <div
                key={message.id}
                className={cn('flex gap-2', isCurrentUser && 'flex-row-reverse')}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={isCurrentUser ? 'bg-primary/10 text-primary' : 'bg-secondary'}>
                    {getInitials(message.sender.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-3 py-2',
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.message_type === 'image' && message.file_url && (
                    <img
                      src={message.file_url}
                      alt="Image"
                      className="rounded max-w-full max-h-48 mb-1"
                    />
                  )}
                  {message.message_type === 'file' && message.file_url && (
                    <a
                      href={message.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm underline mb-1"
                    >
                      <FileIcon className="h-4 w-4" />
                      {message.file_name || 'Download file'}
                    </a>
                  )}
                  {message.message_type === 'voice' && message.file_url && (
                    <audio controls className="max-w-full">
                      <source src={message.file_url} type="audio/webm" />
                    </audio>
                  )}
                  {message.text && (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  )}
                  <div
                    className={cn(
                      'text-[10px] mt-1',
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
        <div className="px-3 py-2 border-t bg-muted/50 flex items-center gap-2">
          {selectedFile.type.startsWith('image/') ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm truncate flex-1">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-background">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={cancelRecording}>
              <X className="h-5 w-5 text-destructive" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">{formatDuration(recordingDuration)}</span>
            </div>
            <Button variant="default" size="icon" onClick={stopRecording}>
              <StopCircle className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
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
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={startRecording}>
              <Mic className="h-5 w-5" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim() && !selectedFile}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
