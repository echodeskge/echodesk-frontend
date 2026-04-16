"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Clock, ExternalLink } from "lucide-react";
import Image from "next/image";
import { EmojiRatingSelector, EMOJI_OPTIONS } from "@/components/review/EmojiRatingSelector";
import { useRatingInfo, useSubmitRating, type RatingType } from "@/hooks/api/usePublicRating";

type Lang = 'ka' | 'en';

const translations = {
  ka: {
    loading: "იტვირთება...",
    invalidLink: "არასწორი ბმული",
    invalidLinkDesc: "ეს შეფასების ბმული არასწორია. გთხოვთ გამოიყენოთ მიღებული ბმული.",
    linkExpired: "ბმულს ვადა გაუვიდა",
    linkExpiredDesc: "ამ შეფასების ბმულს ვადა გაუვიდა.",
    linkExpiredNote: "შეფასების ბმულები მოქმედებს სესიის დასრულებიდან 7 დღის განმავლობაში.",
    alreadyRated: "უკვე შეფასებულია",
    alreadyRatedDesc: "თქვენ უკვე გაგზავნეთ შეფასება. გმადლობთ!",
    invalidToken: "არასწორი ბმული",
    invalidTokenDesc: "ეს შეფასების ბმული არ არის მოქმედი. გთხოვთ შეამოწმოთ მიღებული ბმული.",
    thankYou: "გმადლობთ!",
    feedbackSubmitted: "თქვენი შეფასება გაგზავნილია.",
    redirecting: "გადამისამართება რამდენიმე წამში...",
    visitWebsite: "ვებსაიტზე გადასვლა",
    rateUs: "გთხოვთ შეგვაფასოთ",
    experienceQuestion: "როგორი იყო თქვენი გამოცდილება ჩვენს მხარდაჭერის გუნდთან?",
    comment: "კომენტარი",
    commentOptional: "(არასავალდებულო)",
    commentPlaceholder: "გვითხარით მეტი თქვენი გამოცდილების შესახებ...",
    submitRating: "შეფასების გაგზავნა",
    submitting: "იგზავნება...",
    submitError: "შეფასების გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ ხელახლა.",
  },
  en: {
    loading: "Loading...",
    invalidLink: "Invalid Link",
    invalidLinkDesc: "This rating link is invalid. Please use the link you received.",
    linkExpired: "Link Expired",
    linkExpiredDesc: "This rating link has expired.",
    linkExpiredNote: "Rating links are valid for 7 days after the session ends.",
    alreadyRated: "Already Rated",
    alreadyRatedDesc: "You have already submitted your rating. Thank you!",
    invalidToken: "Invalid Link",
    invalidTokenDesc: "This rating link is not valid. Please check the link you received.",
    thankYou: "Thank You!",
    feedbackSubmitted: "Your feedback has been submitted.",
    redirecting: "Redirecting in a few seconds...",
    visitWebsite: "Visit Website",
    rateUs: "Please rate us",
    experienceQuestion: "How was your experience with our support team?",
    comment: "Comment",
    commentOptional: "(optional)",
    commentPlaceholder: "Tell us more about your experience...",
    submitRating: "Submit Rating",
    submitting: "Submitting...",
    submitError: "Failed to submit rating. Please try again.",
  },
} as const;

function LanguageSwitcher({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-1">
      <button
        onClick={() => onChange('ka')}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
          lang === 'ka'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        KA
      </button>
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
          lang === 'en'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </button>
    </div>
  );
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const type = (searchParams.get("type") || "social") as RatingType;

  const [lang, setLang] = useState<Lang>('ka');
  const [selectedRating, setSelectedRating] = useState<1 | 3 | 5 | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const t = translations[lang];

  const { data: ratingInfo, isLoading: isLoadingInfo } = useRatingInfo(token, type);
  const submitRating = useSubmitRating();

  const handleSubmit = async () => {
    if (!token || !selectedRating) return;

    try {
      const result = await submitRating.mutateAsync({
        token,
        type,
        data: {
          rating: selectedRating,
          comment: comment.trim() || undefined,
        },
      });
      setSubmitted(true);
      if (result.redirect_url) {
        setRedirectUrl(result.redirect_url);
      }
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
            <p className="text-muted-foreground">{t.loading}</p>
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
          <div className="flex justify-end p-4 pb-0">
            <LanguageSwitcher lang={lang} onChange={setLang} />
          </div>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t.invalidLink}</h2>
            <p className="text-muted-foreground">{t.invalidLinkDesc}</p>
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
          <div className="flex justify-end p-4 pb-0">
            <LanguageSwitcher lang={lang} onChange={setLang} />
          </div>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t.linkExpired}</h2>
            <p className="text-muted-foreground mb-2">{t.linkExpiredDesc}</p>
            <p className="text-sm text-muted-foreground">{t.linkExpiredNote}</p>
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
          <div className="flex justify-end p-4 pb-0">
            <LanguageSwitcher lang={lang} onChange={setLang} />
          </div>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t.alreadyRated}</h2>
            <p className="text-muted-foreground">{t.alreadyRatedDesc}</p>
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
          <div className="flex justify-end p-4 pb-0">
            <LanguageSwitcher lang={lang} onChange={setLang} />
          </div>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t.invalidToken}</h2>
            <p className="text-muted-foreground">{t.invalidTokenDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auto-redirect after submission if redirect URL is set
  useEffect(() => {
    if (submitted && redirectUrl) {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitted, redirectUrl]);

  // Successfully submitted
  if (submitted) {
    const selectedEmoji = EMOJI_OPTIONS.find((o) => o.value === selectedRating);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">{t.thankYou}</h2>
            <p className="text-lg text-muted-foreground mb-4">{t.feedbackSubmitted}</p>
            {selectedEmoji && (
              <span className="text-6xl mb-4" role="img" aria-label={selectedEmoji.labelEn}>
                {selectedEmoji.emoji}
              </span>
            )}
            {redirectUrl && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">{t.redirecting}</p>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = redirectUrl}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t.visitWebsite}
                </Button>
              </div>
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
          {/* Language Switcher */}
          <div className="flex justify-end mb-2">
            <LanguageSwitcher lang={lang} onChange={setLang} />
          </div>
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
          <CardTitle className="text-2xl">{t.rateUs}</CardTitle>
          <CardDescription>{t.experienceQuestion}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Emoji selector */}
          <EmojiRatingSelector
            value={selectedRating}
            onChange={setSelectedRating}
            disabled={submitRating.isPending}
            lang={lang}
          />

          {/* Comment field */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-muted-foreground">
              <span>{t.comment}</span>
              <span className="text-xs ml-1">{t.commentOptional}</span>
            </Label>
            <Textarea
              id="comment"
              placeholder={t.commentPlaceholder}
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
              <span>{t.submitError}</span>
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
                {t.submitting}
              </>
            ) : (
              t.submitRating
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
