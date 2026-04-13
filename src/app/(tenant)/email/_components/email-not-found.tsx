import { MailX } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmailMenuButton } from "./email-menu-button";

interface EmailNotFoundProps {
  inline?: boolean;
}

export function EmailNotFound({ inline }: EmailNotFoundProps) {
  const content = (
    <div className="size-full flex flex-col justify-center items-center gap-2 p-6">
      <MailX className="size-24 text-primary/50" />
      <p className="text-muted-foreground text-center">
        No emails found. Try a different filter or compose a new email.
      </p>
      <EmailMenuButton />
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Card className="flex-1 w-full md:w-auto">
      <CardContent className="size-full flex flex-col justify-center items-center gap-2 p-0">
        {content}
      </CardContent>
    </Card>
  );
}
