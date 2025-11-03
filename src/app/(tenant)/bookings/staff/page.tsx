"use client"

import { useState, useEffect } from "react"
import { apiBookingsAdminStaffList } from "@/api/generated"
import { BookingStaff } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, UserCheck, Mail, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function StaffPage() {
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
      const response = await apiBookingsAdminStaffList()
      setStaff((response.results || response) as BookingStaff[])
    } catch (error) {
      console.error("Failed to fetch staff:", error)
      toast({ title: "Error", description: "Failed to fetch staff", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredStaff = staff.filter((member) => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) ||
           member.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <h1 className="text-3xl font-bold">Staff Members</h1>
        <p className="text-muted-foreground mt-1">Manage staff who can perform bookings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>All Staff</CardTitle>
              <CardDescription>{filteredStaff.length} staff member(s) found</CardDescription>
            </div>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
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
              <h3 className="mt-4 text-lg font-semibold">No staff found</h3>
              <p className="text-muted-foreground mt-2">No staff members match your search</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {member.email || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {member.phone_number || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{member.service_count || 0} service(s)</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active_for_bookings ? "default" : "secondary"}>
                          {member.is_active_for_bookings ? "Active" : "Inactive"}
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
