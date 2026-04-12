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

## API Usage — Generated Functions ONLY

**ALWAYS use generated API functions** from `src/api/generated/api.ts` and types from `src/api/generated/interfaces.ts`.

### Rules:
1. **Check generated API first** for any API call — never write manual axios calls if a generated function exists
2. **If the function is missing**, the backend schema needs fixing — add `@extend_schema` decorators on the backend, deploy, then run `npm run generate`
3. **Never use `as any`** to work around type mismatches — fix the backend serializer or generator config instead
4. **Mock return types** against `Awaited<ReturnType<typeof generatedFn>>` in tests
5. **Run `npm run generate`** after any backend model/serializer/view changes to keep types in sync

### When to regenerate:
- After backend model field changes
- After new backend endpoints are added
- After serializer field changes
- Before starting work on a feature that uses API data

## Testing Requirements

**IMPORTANT**: When fixing bugs or adding features, always add or update tests to prevent regressions.

### When to write tests
- **Bug fixes**: Add a test that reproduces the bug scenario BEFORE fixing it. The test should fail without the fix and pass with it.
- **New features**: Add tests covering the core behavior. Focus on edge cases and state transitions.
- **Refactors**: Verify existing tests still pass. Add tests for any behavior that wasn't previously covered.

### What to test
- **Reducers** (`tests/unit/reducers/`): Test all action types, especially state transitions and edge cases like empty arrays, missing data, and action sequencing (e.g., `removeChat` then `updateChats`).
- **Pure functions** (`tests/unit/lib/`): Test conversion functions with all attachment types (image, video, audio, file, sticker), edge cases (empty data, missing fields), and platform-specific logic.
- **Services** (`tests/unit/services/`): Test API call wrappers, auth flows, error handling. Type mock returns against `Awaited<ReturnType<typeof generatedFn>>`.
- **Components** (`tests/unit/components/`): Test user interactions, form validation, conditional rendering. Mock Next.js modules (next-intl, next/link, next/navigation).

### Test file locations
- Mirror source structure: `src/components/auth/sign-in-form.tsx` → `tests/unit/components/auth/sign-in-form.test.tsx`
- Use factory helpers (e.g., `makeChat()`, `makeMessage()`) for test data — never hardcode large objects inline

### Running tests
- `npm run test` — runs Vitest (includes `pretest` → `npm run generate` for fresh API types)
- `npx vitest run` — quick run without regenerating types
- `npx vitest run tests/unit/reducers/chat-reducer.test.ts` — run a specific file

### Known critical test scenarios
These tests guard against past production bugs — do NOT remove them:
- `chat-reducer.test.ts` > "updateChats with empty array wipes all chats" — guards against state wipe during React Query transitions
- `chat-reducer.test.ts` > "removeChat followed by updateChats re-adds it" — documents why `removedChatIdsRef` exists in MessagesChat.tsx
- `chatAdapter.test.ts` > "handles audio as voiceMessage" — ensures audio doesn't render as file attachment
- `chatAdapter.test.ts` > "handles audio via message_type when attachment_url comes from attachments array" — ensures WhatsApp proxy audio URL renders as voiceMessage not file

## Backend/Frontend Deployment Workflow

**IMPORTANT**: On every backend change:
1. Run `python manage.py migrate_schemas` (always, even if no new migrations)
2. Push changes to the backend repository
3. **WAIT** for user signal before continuing with frontend work

This ensures:
- Database schema is always up to date before deploy
- Backend changes are deployed and tested first
- Frontend can be developed against live backend
- User can verify backend functionality before frontend implementation
- Prevents integration issues between frontend and backend
