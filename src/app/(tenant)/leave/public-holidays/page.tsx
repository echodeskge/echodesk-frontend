"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Loader2, CalendarRange } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface PublicHoliday {
  id: number
  name: { en: string; ka: string }
  date: string
  is_recurring: boolean
  applies_to_all: boolean
}

export default function PublicHolidaysPage() {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null)
  const [formData, setFormData] = useState({
    name_en: "",
    name_ka: "",
    date: "",
    is_recurring: false,
    applies_to_all: true,
  })

  useEffect(() => {
    fetchHolidays()
  }, [])

  const fetchHolidays = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await apiLeaveAdminPublicHolidaysList()
      setHolidays([])
    } catch (error) {
      console.error("Failed to fetch holidays:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        name: { en: formData.name_en, ka: formData.name_ka },
        date: formData.date,
        is_recurring: formData.is_recurring,
        applies_to_all: formData.applies_to_all,
      }

      if (editingHoliday) {
        // await apiLeaveAdminPublicHolidaysUpdate(editingHoliday.id, payload)
      } else {
        // await apiLeaveAdminPublicHolidaysCreate(payload)
      }

      setIsDialogOpen(false)
      setEditingHoliday(null)
      fetchHolidays()
      resetForm()
    } catch (error) {
      console.error("Failed to save holiday:", error)
    }
  }

  const handleEdit = (holiday: PublicHoliday) => {
    setEditingHoliday(holiday)
    setFormData({
      name_en: holiday.name.en,
      name_ka: holiday.name.ka,
      date: holiday.date,
      is_recurring: holiday.is_recurring,
      applies_to_all: holiday.applies_to_all,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return

    try {
      // await apiLeaveAdminPublicHolidaysDelete(id)
      fetchHolidays()
    } catch (error) {
      console.error("Failed to delete holiday:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name_en: "",
      name_ka: "",
      date: "",
      is_recurring: false,
      applies_to_all: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Public Holidays</h1>
          <p className="text-muted-foreground mt-1">
            Manage company-wide public holidays
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingHoliday(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Holiday
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingHoliday ? "Edit Holiday" : "Create Holiday"}
                </DialogTitle>
                <DialogDescription>
                  Add a public holiday that will be excluded from leave calculations
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name_en">Name (English)</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) =>
                        setFormData({ ...formData, name_en: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name_ka">Name (Georgian)</Label>
                    <Input
                      id="name_ka"
                      value={formData.name_ka}
                      onChange={(e) =>
                        setFormData({ ...formData, name_ka: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_recurring: checked })
                      }
                    />
                    <Label htmlFor="is_recurring">Recurring Annually</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="applies_to_all"
                      checked={formData.applies_to_all}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, applies_to_all: checked })
                      }
                    />
                    <Label htmlFor="applies_to_all">Applies to All</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingHoliday(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingHoliday ? "Update" : "Create"} Holiday
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Holidays</CardTitle>
          <CardDescription>
            Holidays that are excluded from working day calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <div className="text-center py-12">
              <CalendarRange className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No holidays</h3>
              <p className="text-muted-foreground mb-4">
                Add your first public holiday
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Holiday
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell>{holiday.name.en}</TableCell>
                    <TableCell>
                      {new Date(holiday.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {holiday.is_recurring ? (
                        <Badge variant="default">Annual</Badge>
                      ) : (
                        <Badge variant="outline">One-time</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {holiday.applies_to_all ? "All Employees" : "Specific Departments"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(holiday)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(holiday.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
