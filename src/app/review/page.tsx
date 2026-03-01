"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import Image from "next/image";
import { EmojiRatingSelector, EMOJI_OPTIONS } from "@/components/review/EmojiRatingSelector";
import { useRatingInfo, useSubmitRating } from "@/hooks/api/usePublicRating";

function ReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [selectedRating, setSelectedRating] = useState<1 | 3 | 5 | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: ratingInfo, isLoading: isLoadingInfo } = useRatingInfo(token);
  const submitRating = useSubmitRating();

  const handleSubmit = async () => {
    if (!token || !selectedRating) return;

    try {
      await submitRating.mutateAsync({
        token,
        data: {
          rating: selectedRating,
          comment: comment.trim() || undefined,
        },
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  // Loading state
  if (isLoadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              This rating link is invalid. Please use the link you received.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Token expired
  if (ratingInfo?.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Expired</h2>
            <p className="text-muted-foreground mb-2">
              This rating link has expired.
            </p>
            <p className="text-sm text-muted-foreground">
              Rating links are valid for 7 days after the session ends.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already rated
  if (ratingInfo?.already_rated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Already Rated</h2>
            <p className="text-muted-foreground">
              You have already submitted your rating. Thank you!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (!ratingInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              This rating link is not valid. Please check the link you received.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Successfully submitted
  if (submitted) {
    const selectedEmoji = EMOJI_OPTIONS.find((o) => o.value === selectedRating);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Thank You!</h2>
            <p className="text-lg text-muted-foreground mb-4">
              Your feedback has been submitted.
            </p>
            {selectedEmoji && (
              <span className="text-6xl" role="img" aria-label={selectedEmoji.labelEn}>
                {selectedEmoji.emoji}
              </span>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rating form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {/* Tenant Logo */}
          {ratingInfo?.tenant_logo_url && (
            <div className="flex justify-center mb-4">
              <Image
                src={ratingInfo.tenant_logo_url}
                alt={ratingInfo.tenant_name || "Company logo"}
                width={120}
                height={60}
                className="object-contain max-h-16"
                unoptimized
              />
            </div>
          )}
          <CardTitle className="text-2xl">
            <span className="block">გთხოვთ შეგვაფასოთ</span>
            <span className="block text-lg text-muted-foreground font-normal mt-1">
              Please rate us
            </span>
          </CardTitle>
          <CardDescription>
            How was your experience with our support team?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Emoji selector */}
          <EmojiRatingSelector
            value={selectedRating}
            onChange={setSelectedRating}
            disabled={submitRating.isPending}
          />

          {/* Comment field */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-muted-foreground">
              <span>კომენტარი</span>
              <span className="text-xs ml-1">(არასავალდებულო / optional)</span>
            </Label>
            <Textarea
              id="comment"
              placeholder="Tell us more about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitRating.isPending}
              maxLength={1000}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/1000
            </p>
          </div>

          {/* Error message */}
          {submitRating.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to submit rating. Please try again.</span>
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedRating || submitRating.isPending}
            className="w-full"
            size="lg"
          >
            {submitRating.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <span>შეფასების გაგზავნა</span>
                <span className="mx-2">|</span>
                <span>Submit Rating</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
