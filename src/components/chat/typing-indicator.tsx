export function TypingIndicator({ userName }: { userName: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse py-2">
      <span className="font-medium">{userName}</span>
      <span>is typing</span>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  )
}
