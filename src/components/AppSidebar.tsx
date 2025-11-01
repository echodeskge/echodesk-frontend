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
  ShoppingBag,
  Tags,
  UsersRound,
  ListTree,
  ChevronDown,
  Globe,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { AuthUser, TenantInfo } from "@/types/auth"
import { User } from "@/api/generated/interfaces"
import { MenuItem } from "@/services/permissionService"
import { LockedFeatureBadge } from "@/components/subscription/LockedFeatureBadge"
import { Lock } from "lucide-react"

// Icon mapping for menu items (lucide-react icon names)
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Lucide icon names (from navigationConfig)
  "Ticket": Ticket,
  "Clock": Clock,
  "BarChart3": BarChart3,
  "Phone": Phone,
  "FileText": FileText,
  "Package": Package,
  "ShoppingBag": ShoppingBag,
  "Tags": Tags,
  "ListTree": ListTree,
  "MessageSquare": MessageCircle,
  "Users": Users,
  "UsersRound": UsersRound,
  "Share2": Share2,
  "Settings": Settings,
  "Globe": Globe,
  // Legacy emoji support (for backward compatibility)
  "🏠": Home,
  "🎫": Ticket,
  "📦": Package,
  "📝": FileText,
  "📞": Phone,
  "⏱️": Timer,
  "📊": BarChart3,
  "👥": Users,
  "👨‍👩‍👧‍👦": UserCheck,
  "💬": MessageCircle,
  "📱": Share2,
  "⚙️": Settings,
  "⏰": Clock,
  "🛒": ShoppingCart,
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
    <Sidebar variant="inset" className="bg-white border-r border-gray-200">
      <SidebarHeader className="bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-2">
          {tenant?.theme?.logo_url && (
            <img
              src={tenant.theme.logo_url}
              alt={tenant.name || "Logo"}
              className="h-8 w-auto"
            />
          )}
          <div className="flex flex-col">
            <h2
              className="text-lg font-semibold"
              style={{ color: tenant?.theme?.primary_color }}
            >
              {tenant?.name || "EchoDesk"}
            </h2>
            {tenant?.domain && (
              <p className="text-xs text-muted-foreground">
                {tenant.domain}
              </p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const IconComponent = iconMap[item.icon as keyof typeof iconMap]
                const isActive = currentView === item.id
                const isLocked = item.isLocked || false
                const hasChildren = item.children && item.children.length > 0

                // Check if any child is active
                const isChildActive = hasChildren && item.children!.some(child => currentView === child.id)

                if (hasChildren) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <Collapsible
                        className="group/collapsible"
                        defaultOpen={isChildActive}
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={isLocked ? `🔒 Premium Feature - ${item.description}` : item.description}
                            className="w-full justify-between [&[data-state=open]>svg]:rotate-180"
                          >
                            <span className="flex items-center">
                              {IconComponent ? (
                                <IconComponent className={`h-4 w-4 ${isLocked ? 'text-gray-400' : ''}`} />
                              ) : (
                                <span className={`text-sm ${isLocked ? 'text-gray-400' : ''}`}>{item.icon}</span>
                              )}
                              <span className={`ms-2 ${isLocked ? 'text-gray-500' : ''}`}>{item.label}</span>
                              {isLocked && <LockedFeatureBadge className="ms-2" size="sm" />}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                          <SidebarMenuSub>
                            {item.children!.map((child) => {
                              const ChildIconComponent = iconMap[child.icon as keyof typeof iconMap]
                              const isChildItemActive = currentView === child.id
                              const isChildLocked = child.isLocked || false

                              return (
                                <SidebarMenuSubItem key={child.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => {
                                      if (isChildLocked) {
                                        alert(`This feature requires a premium subscription. Please upgrade your plan to access ${child.label}.`)
                                      } else {
                                        onMenuClick(child.id)
                                      }
                                    }}
                                    isActive={isChildItemActive}
                                    className="cursor-pointer"
                                  >
                                    {ChildIconComponent ? (
                                      <ChildIconComponent className={`h-4 w-4 ${isChildLocked ? 'text-gray-400' : ''}`} />
                                    ) : (
                                      <span className={`text-sm ${isChildLocked ? 'text-gray-400' : ''}`}>{child.icon}</span>
                                    )}
                                    <span className={isChildLocked ? 'text-gray-500' : ''}>{child.label}</span>
                                    {isChildLocked && <LockedFeatureBadge className="ms-auto" size="sm" />}
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )
                }

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        if (isLocked) {
                          // TODO: Show upgrade dialog
                          alert(`This feature requires a premium subscription. Please upgrade your plan to access ${item.label}.`)
                        } else {
                          onMenuClick(item.id)
                        }
                      }}
                      isActive={isActive}
                      tooltip={isLocked ? `🔒 Premium Feature - ${item.description}` : item.description}
                      className={`cursor-pointer transition-all duration-200 ${
                        isLocked
                          ? 'opacity-60 hover:opacity-80'
                          : 'hover:bg-white hover:shadow-sm data-[active=true]:bg-white data-[active=true]:shadow-md'
                      }`}
                      disabled={isLocked}
                    >
                      {IconComponent ? (
                        <IconComponent className={`h-4 w-4 ${isLocked ? 'text-gray-400' : ''}`} />
                      ) : (
                        <span className={`text-sm ${isLocked ? 'text-gray-400' : ''}`}>{item.icon}</span>
                      )}
                      <span className={isLocked ? 'text-gray-500' : ''}>{item.label}</span>
                      {isLocked && <LockedFeatureBadge className="ml-auto" size="sm" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-white">
        <div className="p-4 border-t border-gray-100">
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
            className="w-full bg-white hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
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