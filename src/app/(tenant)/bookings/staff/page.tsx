"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { bookingsAdminStaffList } from "@/api/generated"
import { BookingStaff } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, UserCheck, Mail, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function StaffPage() {
  const t = useTranslations("bookingsStaff")
  const { toast } = useToast()
  const [staff, setStaff] = useState<BookingStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const response = await bookingsAdminStaffList()
      setStaff((response.results || response) as BookingStaff[])
    } catch (error) {
      console.error("Failed to fetch staff:", error)
      toast({ title: t("error"), description: t("fetchFailed"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredStaff = staff.filter((member) => {
    const fullName = `${member.user.first_name} ${member.user.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) ||
           member.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>{t("allStaff")}</CardTitle>
              <CardDescription>{t("staffFound", { count: filteredStaff.length })}</CardDescription>
            </div>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchStaff")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("noStaffFound")}</h3>
              <p className="text-muted-foreground mt-2">{t("noStaffMatch")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("phone")}</TableHead>
                    <TableHead>{t("services")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.user.first_name} {member.user.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {member.user.email || t("na")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {t("na")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{t("servicesCount", { count: 0 })}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active_for_bookings ? "default" : "secondary"}>
                          {member.is_active_for_bookings ? t("active") : t("inactive")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
