# Claude Development Guidelines for EchoDesk

## Component Usage Priority

When building UI components for this project, follow this priority order:

### 1. Full-Kit Components (First Priority)
- **ALWAYS** check the `/full-kit` directory first for existing components
- Full-kit is a pre-built component library with complete, production-ready components
- These components are designed to work together and follow consistent design patterns
- Located in: `/full-kit/src/app/[lang]/(dashboard-layout)/`
- Look for components in subdirectories like: `apps/`, `components/`, etc.

### 2. Shadcn UI Components (Second Priority)
- **ONLY** use shadcn components if the full-kit is missing the specific component you need
- Shadcn components are lower-level UI primitives
- Located in: `/src/components/ui/`
- Can be used to build custom components when full-kit doesn't have what you need

### 3. Custom Components (Last Resort)
- Only create custom components if neither full-kit nor shadcn have what you need
- Follow the existing design patterns from full-kit components
- Use shadcn primitives as building blocks

## Example Workflow

When asked to build a feature:

1. ✅ **Check full-kit first**: "Does full-kit have a chat interface?"
   - Look in `/full-kit/src/app/[lang]/(dashboard-layout)/apps/chat/`
   - If yes → Use or adapt those components

2. ✅ **Check shadcn second**: "Does shadcn have the UI primitives I need?"
   - Look in `/src/components/ui/`
   - If yes → Build using shadcn components

3. ✅ **Build custom last**: "Neither has what I need"
   - Create custom component using shadcn as base
   - Follow full-kit patterns for consistency

## Why This Order?

- **Consistency**: Full-kit components follow the same design system
- **Less Code**: Reusing existing components means less maintenance
- **Faster Development**: Don't reinvent the wheel
- **Better UX**: Pre-built components are tested and polished

## Current Project Structure

```
echodesk-frontend/
├── full-kit/              # Reference component library
│   └── src/
│       └── app/[lang]/(dashboard-layout)/
│           ├── apps/      # Full app examples (chat, kanban, etc.)
│           └── components/ # Reusable components
├── src/
│   ├── app/[tenant]/      # Our tenant-based routes
│   ├── components/        # Our custom components
│   └── components/ui/     # Shadcn UI primitives
```

## Integration Examples

### Good ✅
```typescript
// 1. Check full-kit first
import { ChatBox } from "@/full-kit/src/app/.../chat/_components/chat-box"

// 2. Adapt for our data structure
export function MessagesPage() {
  const conversations = useFacebookMessages()
  const chatsData = convertToFullKitFormat(conversations)
  return <ChatBox chatsData={chatsData} />
}
```

### Bad ❌
```typescript
// Don't build from scratch when full-kit has it
export function MessagesPage() {
  return (
    <div className="custom-chat">
      {/* Building entire chat UI from scratch */}
    </div>
  )
}
```

## Notes

- Always adapt full-kit components to work with our API data structure
- Maintain the visual design from full-kit for consistency
- Document any deviations from full-kit patterns
