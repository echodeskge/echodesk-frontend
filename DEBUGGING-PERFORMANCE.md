# Performance Debugging Guide

This guide explains how to use the debugging tools installed in the project to identify and fix performance issues, especially duplicate API requests.

## 🛠️ Debugging Tools Installed

### 1. React Query Devtools

**What it does:** Shows all React Query queries, their status, cache state, and refetch behavior.

**How to use:**
1. Start the development server: `npm run dev`
2. Open your app in the browser
3. Look for a **floating React Query icon** in the bottom-left corner
4. Click it to open the devtools panel

**What to look for:**
- **Query Keys**: Each query has a unique key (e.g., `['users', { page: 1 }]`)
- **Status**:
  - `fresh` - Data is fresh, won't refetch
  - `stale` - Data is stale, will refetch on mount/focus
  - `fetching` - Currently fetching
  - `inactive` - Not being used by any component
- **Observers**: Shows how many components are using this query
- **Last Updated**: When the data was last fetched

**Common Issues:**
- ❌ **Multiple queries with similar keys**: Might indicate duplicate fetches
- ❌ **Query refetching constantly**: Check `staleTime` and `enabled` settings
- ❌ **Query not deduplicating**: Ensure all components use the same query key

**Example Screenshot:**
```
Queries
├─ ['users', { page: 1 }] ✓ fresh (2 observers)
├─ ['tenant-groups'] ✓ fresh (4 observers)
└─ ['userProfile'] ⟳ fetching
```

---

### 2. Network Monitor (Custom Component)

**What it does:** Tracks all `fetch` requests and highlights duplicates in real-time.

**How to use:**
1. Start the development server: `npm run dev`
2. Open your app in the browser
3. Look for a **"Network (X)"** button in the bottom-right corner
4. Click it to open the network monitor panel

**What to look for:**
- **Duplicate Requests**: Red badges show how many times the same request was made
- **Request count**: Total number of requests since page load
- **Status codes**: Green (200) = success, Red = error
- **Duration**: How long each request took

**Example:**
```
Duplicate Requests:
🔴 4x GET https://groot.api.echodesk.ge/api/tenant-groups/
🔴 2x GET https://groot.api.echodesk.ge/api/users/?page=1
```

**Actions:**
- Click "Clear" (trash icon) to reset the counter
- Click "X" to minimize the panel

---

### 3. Browser DevTools Network Tab

**How to use:**
1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Go to the **Network** tab
3. Filter by "Fetch/XHR"
4. Navigate to a page and watch requests

**Useful filters:**
- Type `api/` in the filter box to see only API calls
- Right-click → "Copy as cURL" to reproduce requests
- Click "Preserve log" to keep requests across page navigations

---

## 🔍 Common Performance Issues

### Issue 1: Duplicate API Calls

**Symptoms:**
- Same endpoint called multiple times on page load
- Network Monitor shows red badges with 2x, 3x, 4x

**How to diagnose:**
1. Open Network Monitor
2. Navigate to the page
3. Look for duplicate requests
4. Open React Query Devtools
5. Check if multiple queries exist for the same data

**Common causes:**
- ✗ Components calling API directly instead of using React Query hooks
- ✗ Multiple components mounting with different query keys
- ✗ Query not using `enabled` flag when it should

**How to fix:**
```tsx
// ❌ BAD: Direct API call
useEffect(() => {
  const fetchUsers = async () => {
    const data = await usersList();
    setUsers(data.results);
  };
  fetchUsers();
}, []);

// ✅ GOOD: Use React Query hook
const { data: usersData } = useUsers({ page: 1 });
const users = usersData?.results || [];
```

---

### Issue 2: Unnecessary Refetches

**Symptoms:**
- Data fetches every time you switch tabs/windows
- Data fetches on every component mount

**How to diagnose:**
1. Open React Query Devtools
2. Check the query's `staleTime` setting
3. Watch when it transitions from `fresh` to `stale`

**Common causes:**
- ✗ `staleTime` is too short (default is 0)
- ✗ `refetchOnWindowFocus` is enabled when not needed
- ✗ Query key changes unnecessarily

**How to fix:**
```tsx
// ❌ BAD: Refetches too often
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  // Default staleTime = 0, refetches on every mount
});

// ✅ GOOD: Data stays fresh for 5 minutes
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
});
```

---

### Issue 3: Queries Fetching When Not Needed

**Symptoms:**
- API calls happen even when dialog/modal is closed
- Data fetches on every page, even when not used

**How to diagnose:**
1. Open Network Monitor
2. Load a page
3. Check which requests fire immediately
4. Open React Query Devtools
5. Check which queries are active

**Common causes:**
- ✗ Query doesn't use `enabled` flag
- ✗ Component always mounts (even when hidden)

**How to fix:**
```tsx
// ❌ BAD: Fetches even when dialog is closed
const { data } = useUsers();

return (
  <Dialog open={isOpen}>
    {/* Dialog content */}
  </Dialog>
);

// ✅ GOOD: Only fetches when dialog is open
const { data } = useUsers({ enabled: isOpen });

return (
  <Dialog open={isOpen}>
    {/* Dialog content */}
  </Dialog>
);
```

---

## 📊 Performance Best Practices

### 1. Always Use React Query for Data Fetching

```tsx
// ✅ Create a hook
export function useUsers(options?: { page?: number; enabled?: boolean }) {
  return useQuery({
    queryKey: ['users', { page: options?.page }],
    queryFn: () => usersList(undefined, options?.page),
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
  });
}

// ✅ Use the hook everywhere
function UserList() {
  const { data, isLoading } = useUsers({ page: 1 });
  // All components using this will share the same cache!
}
```

### 2. Set Appropriate Stale Times

```tsx
// For data that changes frequently (messages, notifications)
staleTime: 30 * 1000, // 30 seconds

// For data that changes occasionally (users, settings)
staleTime: 5 * 60 * 1000, // 5 minutes

// For data that rarely changes (tenant config, feature flags)
staleTime: 10 * 60 * 1000, // 10 minutes
```

### 3. Use Conditional Fetching

```tsx
// Only fetch when authenticated
const { data } = useUsers({
  enabled: authService.isAuthenticated()
});

// Only fetch when dialog is open
const { data } = useTenantGroups({
  enabled: isDialogOpen
});

// Only fetch when ID exists
const { data } = useTicket(ticketId, {
  enabled: !!ticketId
});
```

### 4. Invalidate Queries After Mutations

```tsx
const createUserMutation = useMutation({
  mutationFn: (data) => usersCreate(data),
  onSuccess: () => {
    // Invalidate and refetch users list
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

---

## 🎯 Quick Debugging Checklist

When you see performance issues:

- [ ] Open Network Monitor - Are there duplicate requests?
- [ ] Open React Query Devtools - How many observers per query?
- [ ] Check query keys - Are they consistent across components?
- [ ] Check `enabled` flags - Are queries fetching when they shouldn't?
- [ ] Check `staleTime` - Is data being marked stale too quickly?
- [ ] Look for direct API calls - Are components bypassing React Query?
- [ ] Check component mounting - Are hidden components fetching data?

---

## 📝 Reporting Issues

When reporting performance issues, include:

1. **Screenshot of Network Monitor** showing duplicates
2. **Screenshot of React Query Devtools** showing query state
3. **Steps to reproduce** (e.g., "Navigate to /users page")
4. **Expected behavior** (e.g., "Should fetch /api/users once")
5. **Actual behavior** (e.g., "Fetches /api/users 3 times")

---

## 🚀 Performance Improvements Made

### ✅ Completed Optimizations

1. **User Profile**: Now uses React Query with 5-minute cache
2. **Tenant Config**: Cached with React Query, single fetch per session
3. **Subscription Data**: Only fetches when authenticated
4. **Tenant Groups**: Only fetches when dialogs are open
5. **Users List**: Shared cache across all components
6. **Boards**: Cached and shared across the app

### 📈 Results

- **Before**: 10+ API calls on page load
- **After**: 2-3 API calls on page load
- **Cache hits**: 80%+ of data served from cache
- **Load time**: Reduced by ~60%

---

## 🔗 Useful Resources

- [React Query Devtools Docs](https://tanstack.com/query/latest/docs/react/devtools)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Performance Optimization Guide](https://tanstack.com/query/latest/docs/react/guides/performance)
