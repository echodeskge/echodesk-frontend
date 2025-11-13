import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface InvoiceStatusBadgeProps {
  status: "draft" | "sent" | "viewed" | "partially_paid" | "paid" | "overdue";
  isOverdue?: boolean;
}

export function InvoiceStatusBadge({ status, isOverdue }: InvoiceStatusBadgeProps) {
  const t = useTranslations("invoices");

  const getVariant = () => {
    if (isOverdue) return "destructive";

    switch (status) {
      case "paid":
        return "default";
      case "partially_paid":
        return "secondary";
      case "sent":
      case "viewed":
        return "outline";
      case "overdue":
        return "destructive";
      case "draft":
      default:
        return "secondary";
    }
  };

  const displayStatus = isOverdue ? "overdue" : status;

  return (
    <Badge variant={getVariant() as any}>
      {t(`status.${displayStatus}`)}
    </Badge>
  );
}
