"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { List, FileText, Settings, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const settingsSections = [
    {
      title: "Item Lists",
      description: "Manage dynamic lists of items with hierarchical structure",
      icon: List,
      href: "/settings/item-lists",
      color: "text-blue-500",
    },
    {
      title: "Ticket Forms",
      description: "Create and manage custom ticket forms with attached lists",
      icon: FileText,
      href: "/settings/ticket-forms",
      color: "text-green-500",
    },
    {
      title: "General Settings",
      description: "Configure general application settings",
      icon: Settings,
      href: "#",
      color: "text-gray-500",
      disabled: true,
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your application settings and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {settingsSections.map((section) => {
              const Icon = section.icon;

              if (section.disabled) {
                return (
                  <div
                    key={section.href}
                    className="flex items-start gap-4 rounded-lg border p-4 opacity-50"
                  >
                    <div className={`rounded-lg bg-accent p-2 ${section.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Coming soon...
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <Link key={section.href} href={section.href}>
                  <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent cursor-pointer group">
                    <div className={`rounded-lg bg-accent p-2 ${section.color} group-hover:bg-background`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{section.title}</h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
