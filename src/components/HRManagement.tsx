"use client";

import { useState, useEffect, useCallback } from "react";
import { authService } from "@/services/auth";
import { User } from "@/api/generated/interfaces";

// Temporary interfaces until API is generated
interface WorkSchedule {
  id: number;
  name: string;
  schedule_type: string;
  hours_per_day: number;
  hours_per_week: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  start_time?: string;
  end_time?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface LeaveType {
  id: number;
  name: string;
  category: string;
  max_days_per_year: number;
  requires_approval: boolean;
  min_notice_days: number;
  max_consecutive_days?: number;
  carry_over_allowed: boolean;
  max_carry_over_days?: number;
  gender_restriction?: string;
  requires_medical_certificate: boolean;
  medical_certificate_after_days?: number;
  min_service_months: number;
  is_paid: boolean;
  color: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LeaveRequest {
  id: number;
  employee_name: string;
  employee_email: string;
  leave_type_name: string;
  leave_type_category: string;
  approved_by_name?: string;
  start_date: string;
  end_date: string;
  duration_type: string;
  start_time?: string;
  end_time?: string;
  total_days: string;
  working_days_count: string;
  reason: string;
  emergency_contact?: string;
  handover_notes?: string;
  status: string;
  approval_date?: string;
  approval_comments?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  employee: number;
  leave_type: number;
  approved_by?: number;
}

interface LeaveBalance {
  id: number;
  employee_name: string;
  leave_type_name: string;
  year: number;
  allocated_days: string;
  used_days: string;
  pending_days: string;
  carried_over_days: string;
  available_days: string;
  created_at: string;
  updated_at: string;
  employee: number;
  leave_type: number;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  color: string;
  employee: string;
  leave_type: string;
  total_days: number;
  status: string;
}

interface EmployeeSummary {
  employee_id: number;
  employee_name: string;
  employee_email: string;
  department?: string;
  leave_balances: {
    leave_type_name: string;
    leave_type_category: string;
    allocated_days: string;
    used_days: string;
    pending_days: string;
    available_days: string;
    carry_over_days?: string;
  }[];
  total_requests: number;
  approved_requests: number;
  pending_requests: number;
  rejected_requests: number;
}

export default function HRManagement() {
  const [activeTab, setActiveTab] = useState<"schedules" | "leave-types" | "leave-requests" | "leave-balances" | "calendar" | "employee-summary">("schedules");
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState<User | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      setUserProfile(profile);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      setError("Failed to load user profile");
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      const axiosInstance = (await import("@/api/axios")).default;
      
      switch (activeTab) {
        case "schedules":
          const schedulesResponse = await axiosInstance.get('/api/hr/work-schedules/');
          setWorkSchedules(schedulesResponse.data.results || schedulesResponse.data);
          break;
        case "leave-types":
          const typesResponse = await axiosInstance.get('/api/hr/leave-types/');
          setLeaveTypes(typesResponse.data.results || typesResponse.data);
          break;
        case "leave-requests":
          const requestsResponse = await axiosInstance.get('/api/hr/leave-requests/');
          setLeaveRequests(requestsResponse.data.results || requestsResponse.data);
          break;
        case "leave-balances":
          const balancesResponse = await axiosInstance.get('/api/hr/leave-balances/');
          setLeaveBalances(balancesResponse.data.results || balancesResponse.data);
          break;
        case "calendar":
          const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          const calendarResponse = await axiosInstance.get(
            `/api/hr/leave-requests/calendar_view/?start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`
          );
          setCalendarEvents(calendarResponse.data || []);
          break;
        case "employee-summary":
          // Instead of using the broken employee_summary endpoint, 
          // let's fetch data from multiple working endpoints and combine them
          try {
            // Fetch all leave balances for the selected year
            const balancesResponse = await axiosInstance.get(`/api/hr/leave-balances/?year=${selectedYear}`);
            const balances = balancesResponse.data.results || balancesResponse.data;
            
            // Fetch all leave requests for the selected year
            const requestsResponse = await axiosInstance.get(`/api/hr/leave-requests/?year=${selectedYear}`);
            const requests = requestsResponse.data.results || requestsResponse.data;
            
            // Group data by employee
            const employeeMap = new Map();
            
            // Process leave balances
            balances.forEach((balance: LeaveBalance) => {
              const empId = balance.employee;
              if (!employeeMap.has(empId)) {
                employeeMap.set(empId, {
                  employee_id: empId,
                  employee_name: balance.employee_name || 'Unknown Employee',
                  employee_email: '', // Will be filled from requests if available
                  department: '',
                  leave_balances: [],
                  total_requests: 0,
                  approved_requests: 0,
                  pending_requests: 0,
                  rejected_requests: 0
                });
              }
              
              const emp = employeeMap.get(empId);
              emp.leave_balances.push({
                leave_type_name: balance.leave_type_name,
                leave_type_category: 'general', // Default category since not available in balance
                allocated_days: balance.allocated_days,
                used_days: balance.used_days,
                pending_days: balance.pending_days,
                available_days: balance.available_days,
                carry_over_days: balance.carried_over_days || '0'
              });
            });
            
            // Process leave requests to count statistics
            requests.forEach((request: LeaveRequest) => {
              const empId = request.employee;
              if (employeeMap.has(empId)) {
                const emp = employeeMap.get(empId);
                
                // Fill in employee email if not already set and available from request
                if (!emp.employee_email && request.employee_email) {
                  emp.employee_email = request.employee_email;
                }
                
                emp.total_requests++;
                
                switch (request.status) {
                  case 'approved':
                  case 'completed':
                    emp.approved_requests++;
                    break;
                  case 'pending_approval':
                  case 'submitted':
                    emp.pending_requests++;
                    break;
                  case 'rejected':
                  case 'cancelled':
                    emp.rejected_requests++;
                    break;
                }
              }
            });
            
            // Convert map to array
            const employeeSummaryData = Array.from(employeeMap.values());
            setEmployeeSummary(employeeSummaryData);
          } catch (summaryError) {
            console.error('Failed to fetch employee summary data:', summaryError);
            // If the combined approach fails, just set empty array
            setEmployeeSummary([]);
          }
          break;
      }
    } catch (err) {
      console.error(`Failed to fetch ${activeTab}:`, err);
      setError(`Failed to load ${activeTab.replace('-', ' ')}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentDate, selectedYear]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [activeTab, userProfile, fetchData]);

  const formatWorkingDays = (schedule: WorkSchedule) => {
    const days = [];
    if (schedule.monday) days.push("Mon");
    if (schedule.tuesday) days.push("Tue");
    if (schedule.wednesday) days.push("Wed");
    if (schedule.thursday) days.push("Thu");
    if (schedule.friday) days.push("Fri");
    if (schedule.saturday) days.push("Sat");
    if (schedule.sunday) days.push("Sun");
    return days.join(", ");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "#28a745";
      case "pending_approval": return "#ffc107";
      case "submitted": return "#17a2b8";
      case "rejected": return "#dc3545";
      case "cancelled": return "#6c757d";
      case "completed": return "#007bff";
      default: return "#6c757d";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_approval": return "Pending Approval";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isDateInRange = (date: Date, start: string, end: string) => {
    const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startDate = new Date(start);
    const endDate = new Date(end);
    return currentDate >= startDate && currentDate <= endDate;
  };

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => 
      isDateInRange(date, event.start, event.end)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const tabs = [
    { id: "schedules", label: "Work Schedules", icon: "🕒" },
    { id: "leave-types", label: "Leave Types", icon: "📋" },
    { id: "leave-requests", label: "Leave Requests", icon: "📝" },
    { id: "leave-balances", label: "Leave Balances", icon: "⚖️" },
    { id: "calendar", label: "Calendar View", icon: "📅" },
    { id: "employee-summary", label: "Employee Summary", icon: "👨‍💼" },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <div style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "30px",
          textAlign: "center"
        }}>
          <h1 style={{ margin: "0 0 10px 0", fontSize: "28px", fontWeight: "700" }}>
            👔 HR Management
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "16px" }}>
            Manage work schedules, leave types, and employee requests
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          borderBottom: "1px solid #e1e5e9",
          background: "#f8f9fa"
        }}>
          <div style={{
            display: "flex",
            overflowX: "auto",
            padding: "0 20px"
          }}>
            {tabs.map((tab) => (
                            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "schedules" | "leave-types" | "leave-requests" | "leave-balances" | "calendar" | "employee-summary")}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "16px 24px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: activeTab === tab.id ? "#667eea" : "#6c757d",
                  borderBottom: activeTab === tab.id ? "3px solid #667eea" : "3px solid transparent",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "30px" }}>
          {error && (
            <div style={{
              background: "#f8d7da",
              color: "#721c24",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "1px solid #f5c6cb"
            }}>
              {error}
              <button
                onClick={() => setError("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#721c24",
                  cursor: "pointer",
                  float: "right",
                  fontSize: "16px",
                  fontWeight: "bold"
                }}
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px"
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #667eea",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }}></div>
            </div>
          ) : (
            <>
              {/* Work Schedules Tab */}
              {activeTab === "schedules" && (
                <div>
                  <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>Work Schedules</h3>
                  {workSchedules.length === 0 ? (
                    <div style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🕒</div>
                      <h4 style={{ margin: "0 0 8px 0" }}>No Work Schedules Found</h4>
                      <p style={{ margin: 0 }}>No work schedules have been configured yet.</p>
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                      gap: "20px"
                    }}>
                      {workSchedules.map((schedule) => (
                        <div key={schedule.id} style={{
                          border: "1px solid #e1e5e9",
                          borderRadius: "8px",
                          padding: "20px",
                          background: "#f8f9fa"
                        }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px"
                          }}>
                            <h4 style={{ margin: 0, color: "#333" }}>{schedule.name}</h4>
                            {schedule.is_default && (
                              <span style={{
                                background: "#28a745",
                                color: "white",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "600"
                              }}>
                                Default
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "14px", color: "#666", lineHeight: "1.5" }}>
                            <div><strong>Type:</strong> {schedule.schedule_type}</div>
                            <div><strong>Hours per day:</strong> {schedule.hours_per_day}</div>
                            <div><strong>Hours per week:</strong> {schedule.hours_per_week}</div>
                            <div><strong>Working days:</strong> {formatWorkingDays(schedule)}</div>
                            {schedule.start_time && schedule.end_time && (
                              <div><strong>Hours:</strong> {schedule.start_time} - {schedule.end_time}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Leave Types Tab */}
              {activeTab === "leave-types" && (
                <div>
                  <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>Leave Types</h3>
                  {leaveTypes.length === 0 ? (
                    <div style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                      <h4 style={{ margin: "0 0 8px 0" }}>No Leave Types Found</h4>
                      <p style={{ margin: 0 }}>No leave types have been configured yet.</p>
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                      gap: "20px"
                    }}>
                      {leaveTypes.map((leaveType) => (
                        <div key={leaveType.id} style={{
                          border: "1px solid #e1e5e9",
                          borderRadius: "8px",
                          padding: "20px",
                          background: "#f8f9fa",
                          borderLeft: `4px solid ${leaveType.color}`
                        }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px"
                          }}>
                            <h4 style={{ margin: 0, color: "#333" }}>{leaveType.name}</h4>
                            <span style={{
                              background: leaveType.is_active ? "#28a745" : "#dc3545",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              {leaveType.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div style={{ fontSize: "14px", color: "#666", lineHeight: "1.5" }}>
                            <div><strong>Category:</strong> {leaveType.category}</div>
                            <div><strong>Max days/year:</strong> {leaveType.max_days_per_year}</div>
                            <div><strong>Requires approval:</strong> {leaveType.requires_approval ? "Yes" : "No"}</div>
                            <div><strong>Notice period:</strong> {leaveType.min_notice_days} days</div>
                            <div><strong>Paid:</strong> {leaveType.is_paid ? "Yes" : "No"}</div>
                            {leaveType.carry_over_allowed && (
                              <div><strong>Carry over:</strong> Up to {leaveType.max_carry_over_days} days</div>
                            )}
                            {leaveType.description && (
                              <div style={{ marginTop: "8px" }}><strong>Description:</strong> {leaveType.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Leave Requests Tab */}
              {activeTab === "leave-requests" && (
                <div>
                  <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>Leave Requests</h3>
                  {leaveRequests.length === 0 ? (
                    <div style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
                      <h4 style={{ margin: "0 0 8px 0" }}>No Leave Requests Found</h4>
                      <p style={{ margin: 0 }}>No leave requests have been submitted yet.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "14px"
                      }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #e1e5e9" }}>Employee</th>
                            <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #e1e5e9" }}>Leave Type</th>
                            <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #e1e5e9" }}>Dates</th>
                            <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #e1e5e9" }}>Days</th>
                            <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #e1e5e9" }}>Status</th>
                            <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #e1e5e9" }}>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveRequests.map((request) => (
                            <tr key={request.id} style={{
                              borderBottom: "1px solid #e1e5e9"
                            }}>
                              <td style={{ padding: "12px 8px" }}>
                                <div style={{ fontWeight: "500" }}>{request.employee_name}</div>
                                <div style={{ fontSize: "12px", color: "#666" }}>{request.employee_email}</div>
                              </td>
                              <td style={{ padding: "12px 8px" }}>
                                <span style={{
                                  background: "#e9ecef",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "500"
                                }}>
                                  {request.leave_type_name}
                                </span>
                              </td>
                              <td style={{ padding: "12px 8px" }}>
                                <div>{new Date(request.start_date).toLocaleDateString()}</div>
                                <div style={{ fontSize: "12px", color: "#666" }}>
                                  to {new Date(request.end_date).toLocaleDateString()}
                                </div>
                              </td>
                              <td style={{ padding: "12px 8px" }}>
                                <div>{request.working_days_count} working</div>
                                <div style={{ fontSize: "12px", color: "#666" }}>
                                  ({request.total_days} total)
                                </div>
                              </td>
                              <td style={{ padding: "12px 8px" }}>
                                <span style={{
                                  background: getStatusColor(request.status),
                                  color: "white",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "500"
                                }}>
                                  {getStatusLabel(request.status)}
                                </span>
                              </td>
                              <td style={{ padding: "12px 8px", maxWidth: "200px" }}>
                                <div style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }}>
                                  {request.reason}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Leave Balances Tab */}
              {activeTab === "leave-balances" && (
                <div>
                  <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>Leave Balances</h3>
                  {leaveBalances.length === 0 ? (
                    <div style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚖️</div>
                      <h4 style={{ margin: "0 0 8px 0" }}>No Leave Balances Found</h4>
                      <p style={{ margin: 0 }}>No leave balances have been initialized yet.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "14px"
                      }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #e1e5e9" }}>Employee</th>
                            <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #e1e5e9" }}>Leave Type</th>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "2px solid #e1e5e9" }}>Year</th>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "2px solid #e1e5e9" }}>Allocated</th>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "2px solid #e1e5e9" }}>Used</th>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "2px solid #e1e5e9" }}>Pending</th>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "2px solid #e1e5e9" }}>Available</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveBalances.map((balance) => (
                            <tr key={balance.id} style={{
                              borderBottom: "1px solid #e1e5e9"
                            }}>
                              <td style={{ padding: "12px 8px" }}>
                                <div style={{ fontWeight: "500" }}>{balance.employee_name}</div>
                              </td>
                              <td style={{ padding: "12px 8px" }}>
                                <span style={{
                                  background: "#e9ecef",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "500"
                                }}>
                                  {balance.leave_type_name}
                                </span>
                              </td>
                              <td style={{ padding: "12px 8px", textAlign: "center" }}>{balance.year}</td>
                              <td style={{ padding: "12px 8px", textAlign: "center" }}>{balance.allocated_days}</td>
                              <td style={{ padding: "12px 8px", textAlign: "center", color: "#dc3545" }}>{balance.used_days}</td>
                              <td style={{ padding: "12px 8px", textAlign: "center", color: "#ffc107" }}>{balance.pending_days}</td>
                              <td style={{ padding: "12px 8px", textAlign: "center", color: "#28a745", fontWeight: "600" }}>
                                {balance.available_days}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Calendar View Tab */}
              {activeTab === "calendar" && (
                <div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px"
                  }}>
                    <h3 style={{ margin: 0, color: "#333" }}>Leave Calendar</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => navigateMonth('prev')}
                        style={{
                          background: "#667eea",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px"
                        }}
                      >
                        ← Previous
                      </button>
                      <span style={{ fontSize: "18px", fontWeight: "600", minWidth: "200px", textAlign: "center" }}>
                        {getMonthName(currentDate)}
                      </span>
                      <button
                        onClick={() => navigateMonth('next')}
                        style={{
                          background: "#667eea",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px"
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>

                  {calendarEvents.length === 0 ? (
                    <div style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
                      <h4 style={{ margin: "0 0 8px 0" }}>No Leave Events This Month</h4>
                      <p style={{ margin: 0 }}>No leave requests found for {getMonthName(currentDate)}.</p>
                    </div>
                  ) : (
                    <div>
                      {/* Calendar Grid */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: "1px",
                        background: "#e1e5e9",
                        border: "1px solid #e1e5e9",
                        borderRadius: "8px",
                        overflow: "hidden"
                      }}>
                        {/* Day Headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} style={{
                            background: "#f8f9fa",
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#495057"
                          }}>
                            {day}
                          </div>
                        ))}

                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                          <div key={`empty-${i}`} style={{
                            background: "white",
                            minHeight: "120px",
                            padding: "8px"
                          }} />
                        ))}

                        {/* Calendar Days */}
                        {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
                          const day = i + 1;
                          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                          const events = getEventsForDate(date);
                          const isToday = new Date().toDateString() === date.toDateString();

                          return (
                            <div key={day} style={{
                              background: "white",
                              minHeight: "120px",
                              padding: "8px",
                              position: "relative",
                              border: isToday ? "2px solid #667eea" : "none"
                            }}>
                              <div style={{
                                fontSize: "14px",
                                fontWeight: isToday ? "700" : "500",
                                color: isToday ? "#667eea" : "#333",
                                marginBottom: "4px"
                              }}>
                                {day}
                              </div>
                              
                              {events.map((event, eventIndex) => (
                                <div key={`${event.id}-${eventIndex}`} 
                                  style={{
                                    background: event.color || getStatusColor(event.status),
                                    color: "white",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    marginBottom: "2px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    cursor: "pointer"
                                  }}
                                  title={`${event.employee} - ${event.leave_type} (${event.total_days} days)`}
                                >
                                  {event.employee.split(' ')[0]} - {event.leave_type}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>

                      {/* Events Legend */}
                      <div style={{ marginTop: "20px" }}>
                        <h4 style={{ margin: "0 0 12px 0", color: "#333" }}>Events This Month</h4>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                          gap: "12px"
                        }}>
                          {calendarEvents.map((event) => (
                            <div key={event.id} style={{
                              border: "1px solid #e1e5e9",
                              borderRadius: "6px",
                              padding: "12px",
                              background: "#f8f9fa",
                              borderLeft: `4px solid ${event.color || getStatusColor(event.status)}`
                            }}>
                              <div style={{ 
                                fontWeight: "600", 
                                fontSize: "14px", 
                                marginBottom: "4px",
                                color: "#333"
                              }}>
                                {event.title}
                              </div>
                              <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                                <div><strong>Employee:</strong> {event.employee}</div>
                                <div><strong>Type:</strong> {event.leave_type}</div>
                                <div><strong>Duration:</strong> {event.total_days} days</div>
                                <div><strong>Period:</strong> {new Date(event.start).toLocaleDateString()} - {new Date(event.end).toLocaleDateString()}</div>
                                <div>
                                  <strong>Status:</strong> 
                                  <span style={{
                                    marginLeft: "6px",
                                    background: event.color || getStatusColor(event.status),
                                    color: "white",
                                    padding: "2px 6px",
                                    borderRadius: "3px",
                                    fontSize: "11px"
                                  }}>
                                    {getStatusLabel(event.status)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Employee Summary Tab */}
              {activeTab === "employee-summary" && (
                <div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px"
                  }}>
                    <h3 style={{ margin: 0, color: "#333" }}>Employee Leave Summary</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500" }}>Year:</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #e1e5e9",
                          borderRadius: "6px",
                          fontSize: "14px",
                          background: "white"
                        }}
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {employeeSummary.length === 0 ? (
                    <div style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>👨‍💼</div>
                      <h4 style={{ margin: "0 0 8px 0" }}>No Employee Data Found</h4>
                      <p style={{ margin: 0 }}>No employee leave summary data available for {selectedYear}.</p>
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))",
                      gap: "20px"
                    }}>
                      {employeeSummary.map((employee) => (
                        <div key={employee.employee_id} style={{
                          border: "1px solid #e1e5e9",
                          borderRadius: "12px",
                          padding: "20px",
                          background: "white",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                          {/* Employee Header */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "16px",
                            paddingBottom: "12px",
                            borderBottom: "1px solid #f1f3f4"
                          }}>
                            <div style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontSize: "18px",
                              fontWeight: "600",
                              marginRight: "12px"
                            }}>
                              {employee.employee_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ 
                                margin: "0 0 4px 0", 
                                color: "#333", 
                                fontSize: "16px",
                                fontWeight: "600"
                              }}>
                                {employee.employee_name}
                              </h4>
                              <p style={{ 
                                margin: "0 0 4px 0", 
                                color: "#666", 
                                fontSize: "14px" 
                              }}>
                                {employee.employee_email}
                              </p>
                              {employee.department && (
                                <p style={{ 
                                  margin: 0, 
                                  color: "#888", 
                                  fontSize: "12px" 
                                }}>
                                  {employee.department}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Request Statistics */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "8px",
                            marginBottom: "16px"
                          }}>
                            <div style={{
                              textAlign: "center",
                              padding: "8px",
                              background: "#f8f9fa",
                              borderRadius: "6px"
                            }}>
                              <div style={{ fontSize: "18px", fontWeight: "600", color: "#495057" }}>
                                {employee.total_requests}
                              </div>
                              <div style={{ fontSize: "11px", color: "#6c757d" }}>Total</div>
                            </div>
                            <div style={{
                              textAlign: "center",
                              padding: "8px",
                              background: "#d4edda",
                              borderRadius: "6px"
                            }}>
                              <div style={{ fontSize: "18px", fontWeight: "600", color: "#155724" }}>
                                {employee.approved_requests}
                              </div>
                              <div style={{ fontSize: "11px", color: "#155724" }}>Approved</div>
                            </div>
                            <div style={{
                              textAlign: "center",
                              padding: "8px",
                              background: "#fff3cd",
                              borderRadius: "6px"
                            }}>
                              <div style={{ fontSize: "18px", fontWeight: "600", color: "#856404" }}>
                                {employee.pending_requests}
                              </div>
                              <div style={{ fontSize: "11px", color: "#856404" }}>Pending</div>
                            </div>
                            <div style={{
                              textAlign: "center",
                              padding: "8px",
                              background: "#f8d7da",
                              borderRadius: "6px"
                            }}>
                              <div style={{ fontSize: "18px", fontWeight: "600", color: "#721c24" }}>
                                {employee.rejected_requests}
                              </div>
                              <div style={{ fontSize: "11px", color: "#721c24" }}>Rejected</div>
                            </div>
                          </div>

                          {/* Leave Balances */}
                          <div>
                            <h5 style={{ 
                              margin: "0 0 12px 0", 
                              color: "#333", 
                              fontSize: "14px",
                              fontWeight: "600"
                            }}>
                              Leave Balances ({selectedYear})
                            </h5>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {employee.leave_balances.map((balance, index) => (
                                <div key={index} style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  background: "#f8f9fa",
                                  borderRadius: "6px",
                                  fontSize: "13px"
                                }}>
                                  <div style={{ fontWeight: "500", color: "#333" }}>
                                    {balance.leave_type_name}
                                  </div>
                                  <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                                    <span style={{ color: "#666" }}>
                                      <strong>Allocated:</strong> {balance.allocated_days}
                                    </span>
                                    <span style={{ color: "#dc3545" }}>
                                      <strong>Used:</strong> {balance.used_days}
                                    </span>
                                    <span style={{ color: "#ffc107" }}>
                                      <strong>Pending:</strong> {balance.pending_days}
                                    </span>
                                    <span style={{ color: "#28a745", fontWeight: "600" }}>
                                      <strong>Available:</strong> {balance.available_days}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Progress Bars for Leave Types */}
                          <div style={{ marginTop: "16px" }}>
                            {employee.leave_balances.map((balance, index) => {
                              const allocated = parseFloat(balance.allocated_days);
                              const used = parseFloat(balance.used_days);
                              const pending = parseFloat(balance.pending_days);
                              const usagePercentage = allocated > 0 ? (used / allocated) * 100 : 0;
                              const pendingPercentage = allocated > 0 ? (pending / allocated) * 100 : 0;
                              
                              return (
                                <div key={index} style={{ marginBottom: "8px" }}>
                                  <div style={{
                                    fontSize: "11px",
                                    color: "#666",
                                    marginBottom: "2px",
                                    display: "flex",
                                    justifyContent: "space-between"
                                  }}>
                                    <span>{balance.leave_type_name}</span>
                                    <span>{Math.round(usagePercentage)}% used</span>
                                  </div>
                                  <div style={{
                                    width: "100%",
                                    height: "6px",
                                    background: "#e9ecef",
                                    borderRadius: "3px",
                                    overflow: "hidden",
                                    position: "relative"
                                  }}>
                                    <div style={{
                                      width: `${usagePercentage}%`,
                                      height: "100%",
                                      background: "#dc3545",
                                      position: "absolute",
                                      left: 0
                                    }} />
                                    <div style={{
                                      width: `${pendingPercentage}%`,
                                      height: "100%",
                                      background: "#ffc107",
                                      position: "absolute",
                                      left: `${usagePercentage}%`
                                    }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
