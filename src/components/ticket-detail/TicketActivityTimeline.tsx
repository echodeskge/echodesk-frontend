"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/api/axios";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  ArrowRight,
  User as UserIcon,
  Tag,
  Clock,
  AlertCircle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityUser {
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ActivityItem {
  type: "comment" | "event";
  id: number;
  text?: string;
  comment?: string;
  action?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  user: ActivityUser;
  created_at: string;
}

interface TicketActivityTimelineProps {
  ticketId: number;
  refreshKey?: number;
}

function getUserName(user: ActivityUser): string {
  if (user.name) return user.name;
  const first = user.first_name || "";
  const last = user.last_name || "";
  return (first + " " + last).trim() || user.email || "Unknown";
}

function getUserInitials(user: ActivityUser): string {
  const name = getUserName(user);
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getEventIcon(fieldName?: string) {
  switch (fieldName?.toLowerCase()) {
    case "status":
    case "column":
      return ArrowRight;
    case "assigned_to":
    case "assignee":
    case "assignments":
      return UserIcon;
    case "tags":
    case "labels":
      return Tag;
    case "priority":
      return AlertCircle;
    default:
      return Activity;
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketActivityTimeline({
  ticketId,
  refreshKey = 0,
}: TicketActivityTimelineProps) {
  const t = useTranslations("tickets");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchActivity = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(
          `/api/tickets/${ticketId}/activity/`
        );
        if (!cancelled) {
          const data = Array.isArray(response.data)
            ? response.data
            : response.data?.results || [];
          setActivities(data);
        }
      } catch (err) {
        // If the activity endpoint doesn't exist, fall back to comments from the ticket
        console.warn("Activity endpoint unavailable, falling back to comments");
        if (!cancelled) {
          try {
            const commentsRes = await axiosInstance.get(
              `/api/tickets/${ticketId}/comments/`
            );
            const comments = Array.isArray(commentsRes.data)
              ? commentsRes.data
              : commentsRes.data?.results ||
                commentsRes.data?.comments ||
                [];
            const mapped: ActivityItem[] = comments.map((c: any) => ({
              type: "comment" as const,
              id: c.id,
              text: c.comment || c.text,
              user: c.user || { name: "Unknown" },
              created_at: c.created_at,
            }));
            setActivities(mapped);
          } catch {
            setActivities([]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchActivity();
    return () => {
      cancelled = true;
    };
  }, [ticketId, refreshKey]);

  // Auto-scroll to bottom on load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [loading, activities.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">{t("ticketDetail.noActivity")}</p>
      </div>
    );
  }

  // Sort oldest first (chat-style)
  const sorted = [...activities].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div
      ref={scrollRef}
      className="max-h-[400px] overflow-y-auto pr-4"
    >
      <div className="space-y-0">
        {sorted.map((item, idx) => {
          const isLast = idx === sorted.length - 1;

          if (item.type === "comment") {
            return (
              <div
                key={`comment-${item.id}`}
                className={cn(
                  "relative pl-8 pb-6 border-l-2 border-muted ml-2",
                  isLast && "border-l-0"
                )}
              >
                <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-3 w-3 text-primary" />
                </div>
                <div className="ml-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {getUserInitials(item.user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {getUserName(item.user)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(item.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap ml-7">
                    {item.text || item.comment}
                  </p>
                </div>
              </div>
            );
          }

          // Event
          const EventIcon = getEventIcon(item.field_name);
          const eventText =
            item.text ||
            (item.field_name && item.old_value && item.new_value
              ? `${getUserName(item.user)} changed ${item.field_name} from "${item.old_value}" to "${item.new_value}"`
              : item.action ||
                `${getUserName(item.user)} updated ${item.field_name || "ticket"}`);

          return (
            <div
              key={`event-${item.id}`}
              className={cn(
                "relative pl-8 pb-4 border-l-2 border-muted ml-2",
                isLast && "border-l-0"
              )}
            >
              <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <EventIcon className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="ml-2 flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{eventText}</p>
                <span className="text-xs text-muted-foreground/70">
                  {formatTime(item.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
