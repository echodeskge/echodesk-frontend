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
import { Plus, Edit, Trash2, Loader2, ListTree } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LeaveType {
  id: number
  name: { en: string; ka: string }
  code: string
  description: { en: string; ka: string }
  is_paid: boolean
  requires_approval: boolean
  calculation_method: string
  default_days_per_year: string
  accrual_rate_per_month: string
  max_carry_forward_days: number
  carry_forward_expiry_months: number
  color: string
  is_active: boolean
  sort_order: number
}

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<LeaveType | null>(null)
  const [formData, setFormData] = useState({
    name_en: "",
    name_ka: "",
    code: "",
    description_en: "",
    description_ka: "",
    is_paid: true,
    requires_approval: true,
    calculation_method: "annual",
    default_days_per_year: "0",
    accrual_rate_per_month: "0",
    max_carry_forward_days: 0,
    carry_forward_expiry_months: 0,
    color: "#3B82F6",
    is_active: true,
    sort_order: 0,
  })

  useEffect(() => {
    fetchLeaveTypes()
  }, [])

  const fetchLeaveTypes = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await leaveAdminLeaveTypesList()
      setLeaveTypes([])
    } catch (error) {
      console.error("Failed to fetch leave types:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        name: { en: formData.name_en, ka: formData.name_ka },
        code: formData.code,
        description: { en: formData.description_en, ka: formData.description_ka },
        is_paid: formData.is_paid,
        requires_approval: formData.requires_approval,
        calculation_method: formData.calculation_method,
        default_days_per_year: formData.default_days_per_year,
        accrual_rate_per_month: formData.accrual_rate_per_month,
        max_carry_forward_days: formData.max_carry_forward_days,
        carry_forward_expiry_months: formData.carry_forward_expiry_months,
        color: formData.color,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      }

      if (editingType) {
        // await leaveAdminLeaveTypesUpdate(editingType.id, payload)
      } else {
        // await leaveAdminLeaveTypesCreate(payload)
      }

      setIsDialogOpen(false)
      setEditingType(null)
      fetchLeaveTypes()
      resetForm()
    } catch (error) {
      console.error("Failed to save leave type:", error)
    }
  }

  const handleEdit = (leaveType: LeaveType) => {
    setEditingType(leaveType)
    setFormData({
      name_en: leaveType.name.en,
      name_ka: leaveType.name.ka,
      code: leaveType.code,
      description_en: leaveType.description.en || "",
      description_ka: leaveType.description.ka || "",
      is_paid: leaveType.is_paid,
      requires_approval: leaveType.requires_approval,
      calculation_method: leaveType.calculation_method,
      default_days_per_year: leaveType.default_days_per_year,
      accrual_rate_per_month: leaveType.accrual_rate_per_month,
      max_carry_forward_days: leaveType.max_carry_forward_days,
      carry_forward_expiry_months: leaveType.carry_forward_expiry_months,
      color: leaveType.color,
      is_active: leaveType.is_active,
      sort_order: leaveType.sort_order,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this leave type?")) return

    try {
      // await leaveAdminLeaveTypesDelete(id)
      fetchLeaveTypes()
    } catch (error) {
      console.error("Failed to delete leave type:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name_en: "",
      name_ka: "",
      code: "",
      description_en: "",
      description_ka: "",
      is_paid: true,
      requires_approval: true,
      calculation_method: "annual",
      default_days_per_year: "0",
      accrual_rate_per_month: "0",
      max_carry_forward_days: 0,
      carry_forward_expiry_months: 0,
      color: "#3B82F6",
      is_active: true,
      sort_order: 0,
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
          <h1 className="text-3xl font-bold">Leave Types</h1>
          <p className="text-muted-foreground mt-1">
            Manage leave types and their configurations
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingType(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Leave Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingType ? "Edit Leave Type" : "Create Leave Type"}
                </DialogTitle>
                <DialogDescription>
                  Configure a leave type with its allocation rules
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      placeholder="e.g., VAC, SICK"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="calculation_method">Calculation Method</Label>
                  <Select
                    value={formData.calculation_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, calculation_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Allocation</SelectItem>
                      <SelectItem value="accrual">Accrual Based</SelectItem>
                      <SelectItem value="manual">Manual Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.calculation_method === "annual" && (
                  <div className="grid gap-2">
                    <Label htmlFor="default_days_per_year">
                      Default Days Per Year
                    </Label>
                    <Input
                      id="default_days_per_year"
                      type="number"
                      step="0.5"
                      value={formData.default_days_per_year}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_days_per_year: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {formData.calculation_method === "accrual" && (
                  <div className="grid gap-2">
                    <Label htmlFor="accrual_rate_per_month">
                      Accrual Rate Per Month
                    </Label>
                    <Input
                      id="accrual_rate_per_month"
                      type="number"
                      step="0.01"
                      value={formData.accrual_rate_per_month}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          accrual_rate_per_month: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="max_carry_forward_days">
                      Max Carry Forward Days
                    </Label>
                    <Input
                      id="max_carry_forward_days"
                      type="number"
                      value={formData.max_carry_forward_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_carry_forward_days: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="carry_forward_expiry_months">
                      Carry Forward Expiry (Months)
                    </Label>
                    <Input
                      id="carry_forward_expiry_months"
                      type="number"
                      value={formData.carry_forward_expiry_months}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          carry_forward_expiry_months: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_paid"
                      checked={formData.is_paid}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_paid: checked })
                      }
                    />
                    <Label htmlFor="is_paid">Paid Leave</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_approval"
                      checked={formData.requires_approval}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, requires_approval: checked })
                      }
                    />
                    <Label htmlFor="requires_approval">Requires Approval</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingType(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingType ? "Update" : "Create"} Leave Type
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Types</CardTitle>
          <CardDescription>
            Configure leave types with allocation rules and carry-forward policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaveTypes.length === 0 ? (
            <div className="text-center py-12">
              <ListTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leave types</h3>
              <p className="text-muted-foreground mb-4">
                Create your first leave type to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Leave Type
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Annual Days</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name.en}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{type.code}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {type.calculation_method}
                    </TableCell>
                    <TableCell>{type.default_days_per_year}</TableCell>
                    <TableCell>
                      {type.max_carry_forward_days > 0
                        ? `${type.max_carry_forward_days} days`
                        : "None"}
                    </TableCell>
                    <TableCell>
                      {type.is_paid ? (
                        <Badge variant="default">Paid</Badge>
                      ) : (
                        <Badge variant="outline">Unpaid</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.requires_approval ? "Required" : "Not Required"}
                    </TableCell>
                    <TableCell>
                      {type.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(type)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(type.id)}
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
