"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { bookingsAdminServicesList, bookingsAdminServicesCreate, bookingsAdminServicesPartialUpdate, bookingsAdminServicesDestroy } from "@/api/generated"
import { ServiceList } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Briefcase, Plus, Edit, Trash2, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ServicesPage() {
  const t = useTranslations("bookingsServices")
  const { toast } = useToast()
  const [services, setServices] = useState<ServiceList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceList | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: "60",
    base_price: "",
    booking_type: "duration_based" as "duration_based" | "fixed_slots",
    status: "active" as "active" | "inactive",
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await bookingsAdminServicesList()
      setServices((response.results || response) as ServiceList[])
    } catch (error) {
      console.error("Failed to fetch services:", error)
      toast({ title: t("error"), description: t("fetchFailed"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (service?: ServiceList) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: typeof service.name === 'string' ? service.name : service.name.en || "",
        description: typeof service.description === 'string' ? service.description : service.description?.en || "",
        duration_minutes: service.duration_minutes?.toString() || "60",
        base_price: service.base_price || "",
        booking_type: (service.booking_type || "duration_based") as "duration_based" | "fixed_slots",
        status: (service.status || "active") as "active" | "inactive",
      })
    } else {
      setEditingService(null)
      setFormData({
        name: "",
        description: "",
        duration_minutes: "60",
        base_price: "",
        booking_type: "duration_based",
        status: "active",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingService) {
        await bookingsAdminServicesPartialUpdate(editingService.id, formData as any)
        toast({ title: t("success"), description: t("serviceUpdated") })
      } else {
        await bookingsAdminServicesCreate(formData as any)
        toast({ title: t("success"), description: t("serviceCreated") })
      }
      setIsDialogOpen(false)
      fetchServices()
    } catch (error) {
      console.error("Failed to save service:", error)
      toast({ title: t("error"), description: t("saveFailed"), variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return

    try {
      await bookingsAdminServicesDestroy(id)
      toast({ title: t("success"), description: t("serviceDeleted") })
      fetchServices()
    } catch (error) {
      console.error("Failed to delete service:", error)
      toast({ title: t("error"), description: t("deleteFailed"), variant: "destructive" })
    }
  }

  const filteredServices = services.filter((service) => {
    const serviceName = typeof service.name === 'string' ? service.name : service.name.en || ""
    return serviceName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const formatCurrency = (amount: string) => {
    return `₾${parseFloat(amount).toFixed(2)}`
  }

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
              <CardTitle>{t("allServices")}</CardTitle>
              <CardDescription>{t("servicesFound", { count: filteredServices.length })}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchServices")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("addService")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("noServicesFound")}</h3>
              <p className="text-muted-foreground mt-2">{t("getStartedServices")}</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createService")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("serviceName")}</TableHead>
                    <TableHead>{t("duration")}</TableHead>
                    <TableHead>{t("price")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => {
                    const serviceName = typeof service.name === 'string' ? service.name : service.name.en || ""
                    return (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div className="font-medium">{serviceName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{service.duration_minutes} {t("min")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(service.base_price)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {service.booking_type === "duration_based" ? t("durationBased") : t("fixedSlots")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={service.status as unknown as string === "active" ? "default" : "secondary"}>
                            {service.status === "active" ? t("active") : t("inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(service)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingService ? t("editService") : t("createService")}</DialogTitle>
            <DialogDescription>
              {editingService ? t("updateServiceDetails") : t("addNewService")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("serviceNameLabel")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("serviceNamePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">{t("durationMinutes")}</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="base_price">{t("priceLabel")}</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">{t("bookingType")}</Label>
                <Select
                  value={formData.booking_type}
                  onValueChange={(value) => setFormData({ ...formData, booking_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duration_based">{t("durationBased")}</SelectItem>
                    <SelectItem value="fixed_slots">{t("fixedSlots")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">{t("statusLabel")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("active")}</SelectItem>
                    <SelectItem value="inactive">{t("inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave}>{editingService ? t("update") : t("create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
