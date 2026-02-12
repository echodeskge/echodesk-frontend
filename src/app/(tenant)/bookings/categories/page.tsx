"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { bookingsAdminCategoriesList, bookingsAdminCategoriesCreate, bookingsAdminCategoriesPartialUpdate, bookingsAdminCategoriesDestroy } from "@/api/generated"
import { ServiceCategory } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, FolderTree, Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function CategoriesPage() {
  const t = useTranslations("bookingsCategories")
  const { toast } = useToast()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await bookingsAdminCategoriesList()
      setCategories((response.results || response) as ServiceCategory[])
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      toast({ title: t("error"), description: t("fetchFailed"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (category?: ServiceCategory) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: typeof category.name === 'string' ? category.name : category.name.en || "",
        description: typeof category.description === 'string' ? category.description : category.description?.en || "",
        is_active: category.is_active ?? true,
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: "",
        description: "",
        is_active: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingCategory) {
        await bookingsAdminCategoriesPartialUpdate(editingCategory.id, formData as any)
        toast({ title: t("success"), description: t("categoryUpdated") })
      } else {
        await bookingsAdminCategoriesCreate(formData as any)
        toast({ title: t("success"), description: t("categoryCreated") })
      }
      setIsDialogOpen(false)
      fetchCategories()
    } catch (error) {
      console.error("Failed to save category:", error)
      toast({ title: t("error"), description: t("saveFailed"), variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return

    try {
      await bookingsAdminCategoriesDestroy(id)
      toast({ title: t("success"), description: t("categoryDeleted") })
      fetchCategories()
    } catch (error) {
      console.error("Failed to delete category:", error)
      toast({ title: t("error"), description: t("deleteFailed"), variant: "destructive" })
    }
  }

  const filteredCategories = categories.filter((category) => {
    const categoryName = typeof category.name === 'string' ? category.name : category.name.en || ""
    return categoryName.toLowerCase().includes(searchQuery.toLowerCase())
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
              <CardTitle>{t("allCategories")}</CardTitle>
              <CardDescription>{t("categoriesFound", { count: filteredCategories.length })}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchCategories")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("addCategory")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("noCategoriesFound")}</h3>
              <p className="text-muted-foreground mt-2">{t("getStartedCategories")}</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createCategory")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("categoryName")}</TableHead>
                    <TableHead>{t("description")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => {
                    const categoryName = typeof category.name === 'string' ? category.name : category.name.en || ""
                    const categoryDesc = typeof category.description === 'string' ? category.description : category.description?.en || ""
                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{categoryName}</TableCell>
                        <TableCell className="text-muted-foreground">{categoryDesc}</TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? t("active") : t("inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
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
            <DialogTitle>{editingCategory ? t("editCategory") : t("createCategory")}</DialogTitle>
            <DialogDescription>
              {editingCategory ? t("updateCategoryDetails") : t("addNewCategory")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("categoryNameLabel")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("categoryNamePlaceholder")}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave}>{editingCategory ? t("update") : t("create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
