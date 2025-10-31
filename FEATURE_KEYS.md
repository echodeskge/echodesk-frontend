# EchoDesk Feature Keys Reference

This document lists all feature keys used in the EchoDesk system for access control.

## Overview

Access control in EchoDesk is managed through **feature keys** stored in the user's `feature_keys` array field. Each user has a JSON array of feature keys that determine which parts of the application they can access.

**How it works:**
1. Backend assigns feature keys to users (stored in `User.feature_keys` as JSON array)
2. Frontend checks if user has required feature key before showing/allowing access
3. **ALL users (including staff and superusers) must have feature keys** - there is no bypass

---

## Navigation Menu Feature Keys

### 1. `ticket_management`
**Controls access to:**
- **Tickets (დაფები)** - Main ticket/board management
- **My Time (ჩემი დრო)** - Personal time tracking

**Type:** Core Feature
**Premium:** No
**Description:** Full access to ticket/task management system including boards, columns, tags, comments, and time tracking.

---

### 2. `advanced_analytics`
**Controls access to:**
- **Time Statistics (დროის სტატისტიკა)** - Team time tracking analytics

**Type:** Premium Feature
**Premium:** Yes ✨
**Description:** Access to advanced analytics and team time tracking statistics. Shows aggregated time data across all users and provides insights into team productivity.

---

### 3. `sip_calling`
**Controls access to:**
- **Calls (ზარები)** - SIP call management

**Type:** Premium Feature
**Premium:** Yes ✨
**Description:** SIP-based calling functionality including call logs, recordings, and events. Requires SIP infrastructure setup.

---

### 4. `order_management`
**Controls access to:**
- **Orders (შეკვეთები)** - Order creation and management

**Type:** Core Feature
**Premium:** No
**Description:** Access to order management system for creating and tracking customer orders.

---

### 5. `facebook_integration`
**Controls access to:**
- **Messages (შეტყობინებები)** - Facebook Messenger integration

**Type:** Premium Feature
**Premium:** Yes ✨
**Additional Requirements:** Facebook pages must be connected
**Description:** Facebook Messenger integration for handling customer messages from Facebook pages.

**Special Logic:**
```typescript
// Only shows if BOTH conditions are met:
// 1. User has "facebook_integration" feature key
// 2. At least one Facebook page is connected
if (item.id === "messages" && !facebookConnected) {
  return false;
}
```

---

### 6. `user_management`
**Controls access to:**
- **Users (მომხმარებლები)** - User account management
- **Groups (ჯგუფები)** - Group and permission management

**Type:** Admin Feature
**Premium:** No
**Description:** Administrative access to manage user accounts, groups, and permissions. Typically only given to administrators.

---

### 7. `social_integrations`
**Controls access to:**
- **Social Media (სოციალური მედია)** - Social media integrations

**Type:** Premium Feature
**Premium:** Yes ✨
**Description:** Access to social media integration management for connecting various social platforms.

---

### 8. `settings_access`
**Controls access to:**
- **Settings (პარამეტრები)** - System settings

**Type:** Admin Feature
**Premium:** No
**Description:** Access to system configuration and settings. Typically only given to administrators.

**Settings Subsections:**
- Subscription & Billing
- Item Lists
- Ticket Forms
- General Settings

---

## Feature Key Summary Table

| Feature Key | Menu Items | Type | Premium | Notes |
|-------------|-----------|------|---------|-------|
| `ticket_management` | Tickets, My Time | Core | No | Main app functionality |
| `advanced_analytics` | Time Statistics | Analytics | Yes ✨ | Team insights |
| `sip_calling` | Calls | Integration | Yes ✨ | Requires SIP setup |
| `order_management` | Orders | Core | No | Order tracking |
| `facebook_integration` | Messages | Integration | Yes ✨ | Requires FB connection |
| `user_management` | Users, Groups | Admin | No | Admin only |
| `social_integrations` | Social Media | Integration | Yes ✨ | Platform connections |
| `settings_access` | Settings | Admin | No | Admin only |

---

## Important: No Bypass for Staff/Superusers

⚠️ **ALL users must have the required feature keys to access menu items.**

There is **NO bypass** for `is_staff` or `is_superuser`. Even administrators must be assigned the appropriate feature keys.

**Example:**
```json
{
  "username": "admin@example.com",
  "is_staff": true,
  "is_superuser": true,
  "feature_keys": [
    "ticket_management",
    "user_management",
    "settings_access"
  ]
}
```

This admin will **only** see: Tickets, My Time, Users, Groups, and Settings.
They will **NOT** see: Calls, Orders, Messages, Social Media (missing feature keys).

To give an admin full access, assign them ALL feature keys:
```json
{
  "feature_keys": [
    "ticket_management",
    "order_management",
    "user_management",
    "settings_access",
    "advanced_analytics",
    "sip_calling",
    "facebook_integration",
    "social_integrations"
  ]
}
```

---

## Default Feature Key Sets

### Basic User
```json
["ticket_management"]
```
**Can access:** Tickets, My Time

---

### Standard User
```json
["ticket_management", "order_management"]
```
**Can access:** Tickets, My Time, Orders

---

### Premium User
```json
[
  "ticket_management",
  "order_management",
  "advanced_analytics",
  "sip_calling",
  "facebook_integration",
  "social_integrations"
]
```
**Can access:** Tickets, My Time, Orders, Time Statistics, Calls, Messages, Social Media

---

### Administrator
```json
[
  "ticket_management",
  "order_management",
  "user_management",
  "settings_access",
  "advanced_analytics",
  "sip_calling",
  "facebook_integration",
  "social_integrations"
]
```
**Can access:** Everything

---

## Backend Implementation

### User Model
```python
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    feature_keys = models.JSONField(
        default=list,
        blank=True,
        help_text="List of feature keys this user has access to"
    )

    def has_feature_key(self, feature_key: str) -> bool:
        """Check if user has a specific feature key"""
        return feature_key in self.feature_keys
```

### API Response Format
```json
{
  "id": 1,
  "username": "user@example.com",
  "email": "user@example.com",
  "is_staff": false,
  "is_superuser": false,
  "feature_keys": [
    "ticket_management",
    "order_management"
  ]
}
```

---

**Last Updated:** 2025-10-31
