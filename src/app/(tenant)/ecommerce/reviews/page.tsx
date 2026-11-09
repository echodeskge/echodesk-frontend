"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ecommerceAdminReviewsList,
  ecommerceAdminReviewsApproveCreate,
  ecommerceAdminReviewsRejectCreate,
  ecommerceAdminReviewsDestroy,
} from "@/api/generated";
import type { ProductReview } from "@/api/generated/interfaces";
import { getApiErrorMessage } from "@/lib/utils";
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
import { MessageSquare } from "lucide-react";
import {
  EcEmptyState,
  EcPage,
  EcTable,
  EcommerceHeaderBridge,
  Segmented,
  StatStrip,
  Toolbar,
  formatCount,
  rdButton,
} from "../_components/ui";
import { getReviewColumns, type ReviewFilter } from "./_components/review-columns";


export default function ReviewsPage() {
  const t = useTranslations("reviews");
  const tu = useTranslations("ecommerceUi");
  const locale = useLocale();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [approvalFilter, setApprovalFilter] = useState<ReviewFilter>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [deletingReview, setDeletingReview] = useState<ProductReview | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ecommerceAdminReviewsList();
      setReviews(response.results || []);
      setLoaded(true);
    } catch (err) {
      setError(err);
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
      await ecommerceAdminReviewsApproveCreate(review.id);
      toast.success(t("approveSuccess"));
      fetchReviews();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("approveError")));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (review: ProductReview) => {
    try {
      setActionLoading(review.id);
      await ecommerceAdminReviewsRejectCreate(review.id);
      toast.success(t("rejectSuccess"));
      fetchReviews();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("rejectError")));
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
    } catch (error) {
      // Deleting reviews needs e-commerce manager rights; show the backend reason.
      toast.error(getApiErrorMessage(error, t("deleteError")));
    }
  };

  const columns = getReviewColumns({
    t,
    locale,
    actionLoading,
    onApprove: handleApprove,
    onReject: handleReject,
    onDelete: setDeletingReview,
  });

  // The first load shows the skeleton; refetches after an action keep the rows on screen.
  const showSkeleton = !loaded && loading;

  return (
    <>
      <EcommerceHeaderBridge
        sub={loaded ? t("reviewsFound", { count: filteredReviews.length }) : null}
      />
      <EcPage fill testId="reviews-page">
        <StatStrip
          loading={showSkeleton}
          testId="reviews-stats"
          items={[
            { key: "total", label: t("stats.total"), value: loaded ? formatCount(stats.total) : null },
            {
              key: "approved",
              label: t("stats.approved"),
              value: loaded ? <span className="text-green-700 dark:text-green-400">{formatCount(stats.approved)}</span> : null,
            },
            {
              key: "pending",
              label: t("stats.pending"),
              value: loaded ? <span className="text-amber-700 dark:text-amber-400">{formatCount(stats.pending)}</span> : null,
            },
          ]}
        />
        <Toolbar testId="reviews-toolbar">
          <Segmented<ReviewFilter>
            ariaLabel={t("filterByStatus")}
            value={approvalFilter}
            onChange={setApprovalFilter}
            testId="reviews-filter"
            options={[
              { value: "all", label: tu("all"), count: loaded ? stats.total : null },
              { value: "pending", label: t("filters.pending"), count: loaded ? stats.pending : null },
              { value: "approved", label: t("filters.approved"), count: loaded ? stats.approved : null },
            ]}
          />
        </Toolbar>
        <EcTable
          ariaLabel={t("reviewsTitle")}
          variant="fill"
          columns={columns}
          rows={showSkeleton ? undefined : filteredReviews}
          rowKey={(r) => r.id}
          error={loaded ? undefined : error}
          onRetry={fetchReviews}
          testId="reviews-table"
          empty={
            <EcEmptyState
              icon={MessageSquare}
              title={t("emptyTitle")}
              description={approvalFilter !== "all" ? t("emptyFiltered") : t("emptyDescription")}
              action={
                approvalFilter !== "all" ? (
                  <button type="button" className={rdButton.outlineSm} onClick={() => setApprovalFilter("all")}>
                    {tu("clearFilters")}
                  </button>
                ) : undefined
              }
            />
          }
          footer={loaded && reviews.length > 0 ? <span>{t("reviewsFound", { count: filteredReviews.length })}</span> : undefined}
        />
      </EcPage>

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
    </>
  );
}
