'use client';

import Link from 'next/link';
import {
  BookOpen,
  Video,
  HelpCircle,
  FileText,
  Settings,
  Users,
  MessageSquare,
  ShoppingCart,
  Calendar,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HelpCategory } from '@/hooks/useHelpCenter';

interface HelpCategoryCardProps {
  category: HelpCategory;
  linkPrefix?: string;
  className?: string;
}

// Map icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  'video': Video,
  'help-circle': HelpCircle,
  'file-text': FileText,
  'settings': Settings,
  'users': Users,
  'message-square': MessageSquare,
  'shopping-cart': ShoppingCart,
  'calendar': Calendar,
  'credit-card': CreditCard,
};

function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || BookOpen;
}

export function HelpCategoryCard({ category, linkPrefix = '/docs', className }: HelpCategoryCardProps) {
  const Icon = getIcon(category.icon);

  return (
    <Link href={`${linkPrefix}/${category.slug}`}>
      <Card className={cn(
        'h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group',
        className
      )}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">
                {category.name}
              </CardTitle>
              {category.description && (
                <CardDescription className="line-clamp-2">
                  {category.description}
                </CardDescription>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {category.article_count} {category.article_count === 1 ? 'article' : 'articles'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
