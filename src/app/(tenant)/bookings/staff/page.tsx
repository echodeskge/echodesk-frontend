"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  bookingsAdminStaffList,
  bookingsAdminStaffCreate,
  bookingsAdminStaffPartialUpdate,
  bookingsAdminStaffDestroy,
  bookingsAdminStaffAvailableUsersRetrieve,
  bookingsAdminServicesList,
} from "@/api/generated"
import { BookingStaff, ServiceList } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, UserCheck, Mail, Phone, Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AvailableUser {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
}

export default function StaffPage() {
  const t = useTranslations("bookingsStaff")
  const { toast } = useToast()
  const [staff, setStaff] = useState<BookingStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<BookingStaff | null>(null)
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [services, setServices] = useState<ServiceList[]>([])
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    user_id: "",
    bio: "",
    is_active_for_bookings: true,
    service_ids: [] as number[],
  })

  useEffect(() => {
    fetchStaff()
    fetchServices()
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

  const fetchServices = async () => {
    try {
      const response = await bookingsAdminServicesList()
      setServices((response.results || response) as ServiceList[])
    } catch (error) {
      console.error("Failed to fetch services:", error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await bookingsAdminStaffAvailableUsersRetrieve()
      setAvailableUsers(response as unknown as AvailableUser[])
    } catch (error) {
      console.error("Failed to fetch available users:", error)
      setAvailableUsers([])
    }
  }

  const handleOpenDialog = async (staffMember?: BookingStaff) => {
    if (staffMember) {
      setEditingStaff(staffMember)
      setFormData({
        user_id: staffMember.user.id.toString(),
        bio: staffMember.bio || "",
        is_active_for_bookings: staffMember.is_active_for_bookings ?? true,
        service_ids: staffMember.services?.map(s => s.id) || [],
      })
    } else {
      setEditingStaff(null)
      await fetchAvailableUsers()
      setFormData({
        user_id: "",
        bio: "",
        is_active_for_bookings: true,
        service_ids: [],
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (editingStaff) {
        await bookingsAdminStaffPartialUpdate(editingStaff.id, {
          bio: formData.bio,
          is_active_for_bookings: formData.is_active_for_bookings,
          service_ids: formData.service_ids,
        })
        toast({ title: t("success"), description: t("staffUpdated") })
      } else {
        if (!formData.user_id) {
          toast({ title: t("error"), description: t("selectUser"), variant: "destructive" })
          return
        }
        await bookingsAdminStaffCreate({
          user_id: parseInt(formData.user_id),
          bio: formData.bio,
          is_active_for_bookings: formData.is_active_for_bookings,
          service_ids: formData.service_ids,
        })
        toast({ title: t("success"), description: t("staffCreated") })
      }
      setIsDialogOpen(false)
      fetchStaff()
    } catch (error) {
      console.error("Failed to save staff:", error)
      toast({ title: t("error"), description: t("saveFailed"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return

    try {
      await bookingsAdminStaffDestroy(id)
      toast({ title: t("success"), description: t("staffDeleted") })
      fetchStaff()
    } catch (error) {
      console.error("Failed to delete staff:", error)
      toast({ title: t("error"), description: t("deleteFailed"), variant: "destructive" })
    }
  }

  const toggleService = (serviceId: number) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }))
  }

  const getServiceName = (service: ServiceList): string => {
    if (typeof service.name === "string") return service.name
    return service.name?.en || service.name_display || ""
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
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchStaff")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t("addStaff")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("noStaffFound")}</h3>
              <p className="text-muted-foreground mt-2">{t("noStaffMatch")}</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {t("addStaff")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("services")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
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
                        {member.services && member.services.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {member.services.slice(0, 2).map((service) => (
                              <Badge key={service.id} variant="secondary" className="text-xs">
                                {service.name_display}
                              </Badge>
                            ))}
                            {member.services.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.services.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t("noServices")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active_for_bookings ? "default" : "secondary"}>
                          {member.is_active_for_bookings ? t("active") : t("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(member.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? t("editStaff") : t("addStaff")}
            </DialogTitle>
            <DialogDescription>
              {editingStaff ? t("editStaffDescription") : t("addStaffDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingStaff && (
              <div className="space-y-2">
                <Label>{t("selectUserLabel")}</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectUserPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.full_name || `${user.first_name} ${user.last_name}`} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("noAvailableUsers")}</p>
                )}
              </div>
            )}

            {editingStaff && (
              <div className="space-y-2">
                <Label>{t("staffMember")}</Label>
                <div className="p-2 bg-muted rounded-md">
                  <p className="font-medium">
                    {editingStaff.user.first_name} {editingStaff.user.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{editingStaff.user.email}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bio">{t("bio")}</Label>
              <Textarea
                id="bio"
                placeholder={t("bioPlaceholder")}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active_for_bookings}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active_for_bookings: !!checked })
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                {t("activeForBookings")}
              </Label>
            </div>

            <div className="space-y-2">
              <Label>{t("assignServices")}</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noServicesAvailable")}</p>
                ) : (
                  services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={formData.service_ids.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <Label
                        htmlFor={`service-${service.id}`}
                        className="cursor-pointer text-sm flex-1"
                      >
                        {getServiceName(service)}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("servicesSelected", { count: formData.service_ids.length })}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : editingStaff ? t("update") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
