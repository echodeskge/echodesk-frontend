"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, Handshake, Loader2, XCircle } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { fetchCovering, respondCovering, type CoveringRequest, type LeaveRequestDetail } from "../_lib/hr-api"
import { substituteStatusVariant } from "../_lib/hr-utils"
import { useDeepLinkId } from "../_lib/useDeepLinkId"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { FeatureGate } from "../_components/FeatureGate"
import { LeaveRequestDetailDialog } from "../_components/LeaveRequestDetailDialog"
import { LeaveStatusBadge } from "../_components/LeaveStatusBadge"

type CoveringTab = "awaiting" | "all"

export default function CoveringPage() {
  const { loaded, features, userId } = useLeaveFeatures()
  return (
    <FeatureGate loaded={loaded} allowed={Boolean(features?.substitutes)}>
      <CoveringList userId={userId} />
    </FeatureGate>
  )
}

function CoveringList({ userId }: { userId?: number }) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<CoveringTab>("awaiting")
  const [rows, setRows] = useState<CoveringRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [deepLinkId, clearDeepLink] = useDeepLinkId()
  const [openId, setOpenId] = useState<number | null>(null)
  const [declineMode, setDeclineMode] = useState(false)
  const [comment, setComment] = useState("")
  const [responding, setResponding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchCovering(tab, locale))
    } catch (error) {
      setRows([])
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [tab, locale, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (deepLinkId !== null) setOpenId(deepLinkId)
  }, [deepLinkId])

  const closeDialog = () => {
    setOpenId(null)
    setDeclineMode(false)
    setComment("")
    if (deepLinkId !== null) clearDeepLink()
  }

  const afterChange = () => {
    load()
    // The sidebar badge counts pending consents (profile.leave_features).
    queryClient.invalidateQueries({ queryKey: ["userProfile"] })
  }

  const respond = async (detail: LeaveRequestDetail, action: "accept" | "reject", reload: () => Promise<void>) => {
    if (responding) return
    const text = comment.trim()
    if (action === "reject" && !text) {
      toast.error(t("hr.covering.declineReasonRequired"))
      return
    }
    setResponding(true)
    try {
      await respondCovering(detail.id, action, text)
      toast.success(action === "accept" ? t("hr.covering.accepted") : t("hr.covering.declined"))
      setDeclineMode(false)
      setComment("")
      await reload()
    } catch (error) {
      toast.error(t("hr.covering.respondFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setResponding(false)
    }
  }

  const renderActions = (detail: LeaveRequestDetail, reload: () => Promise<void>) => {
    const mine = detail.substitutes?.find((s) => s.substitute === userId)
    if (!mine || mine.status !== "pending" || detail.status !== "awaiting_substitutes") return null
    if (declineMode) {
      return (
        <div className="w-full space-y-2">
          <Label htmlFor="decline-comment">{t("hr.covering.declineReason")}</Label>
          <Textarea
            id="decline-comment"
            rows={3}
            value={comment}
            placeholder={t("hr.covering.declinePlaceholder")}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeclineMode(false)}>
              {t("hr.common.cancel")}
            </Button>
            <Button variant="destructive" disabled={responding} onClick={() => respond(detail, "reject", reload)}>
              {responding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("hr.covering.confirmDecline")}
            </Button>
          </div>
        </div>
      )
    }
    return (
      <>
        <Button variant="destructive" onClick={() => setDeclineMode(true)}>
          <XCircle className="h-4 w-4 mr-1" />
          {t("hr.covering.decline")}
        </Button>
        <Button disabled={responding} onClick={() => respond(detail, "accept", reload)}>
          {responding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
          {t("hr.covering.accept")}
        </Button>
      </>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("hr.covering.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("hr.covering.description")}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CoveringTab)}>
        <TabsList>
          <TabsTrigger value="awaiting">{t("hr.covering.tabAwaiting")}</TabsTrigger>
          <TabsTrigger value="all">{t("hr.covering.tabAll")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>{tab === "awaiting" ? t("hr.covering.tabAwaiting") : t("hr.covering.tabAll")}</CardTitle>
          <CardDescription>{t("hr.covering.cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {tab === "awaiting" ? t("hr.covering.emptyAwaiting") : t("hr.covering.emptyAll")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("shared.employee")}</TableHead>
                    <TableHead>{t("shared.leaveType")}</TableHead>
                    <TableHead>{t("shared.startDate")}</TableHead>
                    <TableHead>{t("shared.endDate")}</TableHead>
                    <TableHead>{t("shared.days")}</TableHead>
                    <TableHead>{t("hr.substitutes.task")}</TableHead>
                    <TableHead>{t("hr.covering.myAnswer")}</TableHead>
                    <TableHead>{t("shared.statusLabel")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => setOpenId(row.id)}>
                      <TableCell className="font-medium">{row.employee_name}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: row.leave_type_color || undefined }} className="text-white">
                          {row.leave_type_name}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(row.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(row.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>{row.total_days}</TableCell>
                      <TableCell className="max-w-[240px] truncate" title={row.my_task || ""}>
                        {row.my_task || "—"}
                      </TableCell>
                      <TableCell>
                        {row.my_status ? (
                          <Badge variant={substituteStatusVariant(row.my_status)}>
                            {t(`hr.substituteStatus.${row.my_status}`)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <LeaveStatusBadge status={row.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <LeaveRequestDetailDialog
        requestId={openId}
        scope="covering"
        onClose={closeDialog}
        onChanged={afterChange}
        renderActions={renderActions}
      />
    </div>
  )
}
