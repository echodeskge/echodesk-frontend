"use client"

import { useState, useEffect } from "react"
import { apiBookingsAdminCategoriesList, apiBookingsAdminCategoriesCreate, apiBookingsAdminCategoriesPartialUpdate, apiBookingsAdminCategoriesDestroy } from "@/api/generated"
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
      const response = await apiBookingsAdminCategoriesList()
      setCategories((response.results || response) as ServiceCategory[])
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      toast({ title: "Error", description: "Failed to fetch categories", variant: "destructive" })
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
        await apiBookingsAdminCategoriesPartialUpdate(editingCategory.id, formData as any)
        toast({ title: "Success", description: "Category updated successfully" })
      } else {
        await apiBookingsAdminCategoriesCreate(formData as any)
        toast({ title: "Success", description: "Category created successfully" })
      }
      setIsDialogOpen(false)
      fetchCategories()
    } catch (error) {
      console.error("Failed to save category:", error)
      toast({ title: "Error", description: "Failed to save category", variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return

    try {
      await apiBookingsAdminCategoriesDestroy(id)
      toast({ title: "Success", description: "Category deleted successfully" })
      fetchCategories()
    } catch (error) {
      console.error("Failed to delete category:", error)
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" })
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
        <h1 className="text-3xl font-bold">Service Categories</h1>
        <p className="text-muted-foreground mt-1">Organize your services into categories</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>{filteredCategories.length} categor{filteredCategories.length === 1 ? 'y' : 'ies'} found</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No categories found</h3>
              <p className="text-muted-foreground mt-2">Get started by creating your first category</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                            {category.is_active ? "Active" : "Inactive"}
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
            <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category details" : "Add a new service category"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Beauty, Wellness, Professional Services"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Category description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingCategory ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
