"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    allow_double_booking: false,
    require_payment: true,
    cancellation_hours: "24",
    max_advance_booking_days: "30",
    min_advance_booking_hours: "2",
    deposit_percentage: "50",
    auto_confirm_bookings: false,
    send_reminders: true,
    reminder_hours_before: "24",
  })

  const handleSave = async () => {
    try {
      setLoading(true)
      // TODO: Implement API call to save settings
      toast({ title: "Success", description: "Settings saved successfully" })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Booking Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your booking system preferences</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Basic booking configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Double Booking</Label>
                <p className="text-sm text-muted-foreground">Allow staff to have overlapping bookings</p>
              </div>
              <Switch
                checked={settings.allow_double_booking}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allow_double_booking: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Payment</Label>
                <p className="text-sm text-muted-foreground">Require payment before confirming bookings</p>
              </div>
              <Switch
                checked={settings.require_payment}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, require_payment: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Confirm Bookings</Label>
                <p className="text-sm text-muted-foreground">Automatically confirm new bookings without approval</p>
              </div>
              <Switch
                checked={settings.auto_confirm_bookings}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_confirm_bookings: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Rules</CardTitle>
            <CardDescription>Time constraints and booking policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cancellation">Cancellation Hours</Label>
              <Input
                id="cancellation"
                type="number"
                value={settings.cancellation_hours}
                onChange={(e) =>
                  setSettings({ ...settings, cancellation_hours: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">Hours before booking that clients can cancel</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="advance">Max Advance Booking (Days)</Label>
              <Input
                id="advance"
                type="number"
                value={settings.max_advance_booking_days}
                onChange={(e) =>
                  setSettings({ ...settings, max_advance_booking_days: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">Maximum days in advance clients can book</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minimum">Minimum Advance Booking (Hours)</Label>
              <Input
                id="minimum"
                type="number"
                value={settings.min_advance_booking_hours}
                onChange={(e) =>
                  setSettings({ ...settings, min_advance_booking_hours: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">Minimum hours in advance clients must book</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>Configure payment and deposit requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="deposit">Deposit Percentage</Label>
              <Input
                id="deposit"
                type="number"
                min="0"
                max="100"
                value={settings.deposit_percentage}
                onChange={(e) =>
                  setSettings({ ...settings, deposit_percentage: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">Percentage of total amount required as deposit</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure automated notifications and reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Reminders</Label>
                <p className="text-sm text-muted-foreground">Send automated booking reminders to clients</p>
              </div>
              <Switch
                checked={settings.send_reminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, send_reminders: checked })
                }
              />
            </div>
            {settings.send_reminders && (
              <div className="grid gap-2">
                <Label htmlFor="reminder">Reminder Hours Before</Label>
                <Input
                  id="reminder"
                  type="number"
                  value={settings.reminder_hours_before}
                  onChange={(e) =>
                    setSettings({ ...settings, reminder_hours_before: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">Hours before booking to send reminder</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
