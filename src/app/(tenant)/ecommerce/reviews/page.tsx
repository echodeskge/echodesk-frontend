"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ecommerceAdminReviewsList,
  ecommerceAdminReviewsApproveCreate,
  ecommerceAdminReviewsRejectCreate,
  ecommerceAdminReviewsDestroy,
} from "@/api/generated";
import type { ProductReview, ProductReviewRequest } from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Star, CheckCircle, XCircle, Trash2, MessageSquare } from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const t = useTranslations("reviews");

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [deletingReview, setDeletingReview] = useState<ProductReview | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await ecommerceAdminReviewsList();
      setReviews(response.results || []);
    } catch {
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = reviews.filter((review) => {
    if (approvalFilter === "all") return true;
    if (approvalFilter === "approved") return review.is_approved === true;
    if (approvalFilter === "pending") return review.is_approved === false;
    return true;
  });

  const stats = {
    total: reviews.length,
    approved: reviews.filter((r) => r.is_approved).length,
    pending: reviews.filter((r) => !r.is_approved).length,
  };

  const handleApprove = async (review: ProductReview) => {
    try {
      setActionLoading(review.id);
      const payload: ProductReviewRequest = {
        product: review.product,
        rating: review.rating,
        title: review.title,
        content: review.content,
      };
      await ecommerceAdminReviewsApproveCreate(review.id, payload);
      toast.success(t("approveSuccess"));
      fetchReviews();
    } catch {
      toast.error(t("approveError"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (review: ProductReview) => {
    try {
      setActionLoading(review.id);
      const payload: ProductReviewRequest = {
        product: review.product,
        rating: review.rating,
        title: review.title,
        content: review.content,
      };
      await ecommerceAdminReviewsRejectCreate(review.id, payload);
      toast.success(t("rejectSuccess"));
      fetchReviews();
    } catch {
      toast.error(t("rejectError"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingReview) return;
    try {
      await ecommerceAdminReviewsDestroy(deletingReview.id);
      toast.success(t("deleteSuccess"));
      setDeletingReview(null);
      fetchReviews();
    } catch {
      toast.error(t("deleteError"));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.approved")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>{t("reviewsTitle")}</CardTitle>
              <CardDescription>
                {t("reviewsFound", { count: filteredReviews.length })}
              </CardDescription>
            </div>
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                <SelectItem value="pending">{t("filters.pending")}</SelectItem>
                <SelectItem value="approved">{t("filters.approved")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("emptyTitle")}</h3>
              <p className="text-muted-foreground mt-2">
                {approvalFilter !== "all" ? t("emptyFiltered") : t("emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.rating")}</TableHead>
                    <TableHead>{t("table.product")}</TableHead>
                    <TableHead>{t("table.client")}</TableHead>
                    <TableHead className="max-w-[300px]">{t("table.content")}</TableHead>
                    <TableHead>{t("table.verified")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.date")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <StarRating rating={review.rating} />
                      </TableCell>
                      <TableCell className="font-medium">
                        #{review.product}
                      </TableCell>
                      <TableCell>{review.client_name || "-"}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate">
                          {review.title && (
                            <span className="font-medium">{review.title}: </span>
                          )}
                          {review.content || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {review.is_verified_purchase ? (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            {t("verified")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {review.is_approved ? (
                          <Badge variant="default">{t("approved")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("pending")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(review.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!review.is_approved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(review)}
                              disabled={actionLoading === review.id}
                              title={t("approve")}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {review.is_approved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReject(review)}
                              disabled={actionLoading === review.id}
                              title={t("reject")}
                            >
                              <XCircle className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingReview(review)}
                            title={t("delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingReview}
        onOpenChange={(open) => !open && setDeletingReview(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
