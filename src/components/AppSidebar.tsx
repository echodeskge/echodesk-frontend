"use client"

import * as React from "react"
import {
  Ticket,
  Phone,
  ShoppingCart,
  Users,
  UserCheck,
  MessageCircle,
  Share2,
  Settings,
  Clock,
  BarChart3,
  Power,
  FileText,
  Timer,
  Home,
  Package,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { AuthUser, TenantInfo } from "@/types/auth"
import { User } from "@/api/generated/interfaces"
import { MenuItem } from "@/services/permissionService"

// Icon mapping for menu items
const iconMap = {
  "🏠": Home,           // Dashboard
  "🎫": Ticket,         // Tickets
  "📦": Package,        // Orders (from permissionService)
  "📝": FileText,       // Orders (from Dashboard)
  "📞": Phone,          // Calls
  "⏱️": Timer,          // Time tracking
  "📊": BarChart3,      // Statistics
  "👥": Users,          // Users
  "👨‍👩‍👧‍👦": UserCheck,  // Groups
  "💬": MessageCircle,  // Messages
  "📱": Share2,         // Social Media
  "⚙️": Settings,       // Settings
  "⏰": Clock,          // Alternative time icon
  "🛒": ShoppingCart,   // Alternative orders icon
}

interface AppSidebarProps {
  tenant: TenantInfo
  userProfile: User | null
  visibleMenuItems: MenuItem[]
  currentView: string
  onMenuClick: (viewId: string) => void
  onLogout: () => void
}

export function AppSidebar({
  tenant,
  userProfile,
  visibleMenuItems,
  currentView,
  onMenuClick,
  onLogout
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-2">
          {tenant.theme.logo_url && (
            <img
              src={tenant.theme.logo_url}
              alt={tenant.name}
              className="h-8 w-auto"
            />
          )}
          <div className="flex flex-col">
            <h2
              className="text-lg font-semibold"
              style={{ color: tenant.theme.primary_color }}
            >
              {tenant.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {tenant.domain}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const IconComponent = iconMap[item.icon as keyof typeof iconMap]
                const isActive = currentView === item.id

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onMenuClick(item.id)}
                      isActive={isActive}
                      tooltip={item.description}
                    >
                      {IconComponent ? (
                        <IconComponent className="h-4 w-4" />
                      ) : (
                        <span className="text-sm">{item.icon}</span>
                      )}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 border-t">
          {userProfile && (
            <div className="mb-3">
              <p className="text-sm font-medium">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {userProfile.email}
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="w-full"
          >
            <Power className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}