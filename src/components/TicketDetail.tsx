"use client";

import { useState, useEffect } from "react";
import { ticketService } from "@/services/ticketService";
import type {
  Ticket,
  TicketComment,
  User,
  TicketColumn,
} from "@/api/generated/interfaces";
import { apiColumnsList } from "@/api/generated/api";
import axios from "@/api/axios";
import ChecklistItemList from "./ChecklistItemList";
import AssigneeList from "./AssigneeList";
import MultiUserAssignment, { AssignmentData } from "./MultiUserAssignment";
import TimeTracking from "./TimeTracking";

interface TicketDetailProps {
  ticketId: number;
  onBack?: () => void;
  onEdit?: (ticket: Ticket) => void;
}

export default function TicketDetail({
  ticketId,
  onBack,
  onEdit,
}: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [editingAssignments, setEditingAssignments] = useState(false);
  const [tempAssignments, setTempAssignments] = useState<AssignmentData[]>([]);

  useEffect(() => {
    fetchTicket();
    fetchUsers();
    fetchColumns();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const result = await ticketService.getTicket(ticketId);
      setTicket(result);
    } catch (err) {
      console.error("Error fetching ticket:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch ticket");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const result = await ticketService.getUsers();
      setUsers(result.results || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchColumns = async () => {
    try {
      const result = await apiColumnsList();
      setColumns(result.results || []);
    } catch (err) {
      console.error("Error fetching columns:", err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await ticketService.addComment(ticketId, commentText);
      setCommentText("");
      await fetchTicket(); // Refresh ticket to get new comment
    } catch (err) {
      console.error("Error adding comment:", err);
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleColumnChange = async (columnId: string) => {
    if (!ticket) return;

    try {
      const response = await axios.patch(
        `/api/tickets/${ticket.id}/move_to_column/`,
        {
          column_id: parseInt(columnId),
        }
      );
      setTicket(response.data);
    } catch (err) {
      console.error("Error moving ticket:", err);
      setError(err instanceof Error ? err.message : "Failed to move ticket");
    }
  };

  const handleAssign = async (userId: number) => {
    if (!ticket) return;

    try {
      const updatedTicket = await ticketService.assignTicket(ticket.id, userId);
      setTicket(updatedTicket);
    } catch (err) {
      console.error("Error assigning ticket:", err);
      setError(err instanceof Error ? err.message : "Failed to assign ticket");
    }
  };

  const handleStartEditingAssignments = () => {
    if (!ticket) return;

    // Initialize temp assignments from current ticket
    const currentAssignments: AssignmentData[] = [];

    if (ticket.assignments && ticket.assignments.length > 0) {
      currentAssignments.push(
        ...ticket.assignments.map((assignment) => ({
          userId: assignment.user.id,
          role: (assignment.role as any) || "collaborator",
        }))
      );
    } else if (ticket.assigned_to) {
      currentAssignments.push({
        userId: ticket.assigned_to.id,
        role: "primary",
      });
    }

    setTempAssignments(currentAssignments);
    setEditingAssignments(true);
  };

  const handleCancelEditingAssignments = () => {
    setEditingAssignments(false);
    setTempAssignments([]);
  };

  const handleSaveAssignments = async () => {
    if (!ticket) return;

    try {
      // Prepare assignment data
      const assigned_user_ids = tempAssignments.map((a) => a.userId);
      const assignment_roles: Record<string, string> = {};
      tempAssignments.forEach((a) => {
        assignment_roles[a.userId.toString()] = a.role;
      });

      // Set primary assignee
      const primaryAssignment =
        tempAssignments.find((a) => a.role === "primary") || tempAssignments[0];
      const assigned_to_id = primaryAssignment?.userId;

      const updatedTicket = await ticketService.updateTicket(ticket.id, {
        assigned_to_id,
        assigned_user_ids,
        assignment_roles,
      });

      setTicket(updatedTicket);
      setEditingAssignments(false);
      setTempAssignments([]);
    } catch (err) {
      console.error("Error updating assignments:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update assignments"
      );
    }
  };

  const getColumnColor = (column: TicketColumn | null | undefined) => {
    if (column?.color) {
      return column.color;
    }
    return "#3498db"; // Default blue
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "#e74c3c";
      case "high":
        return "#e67e22";
      case "medium":
        return "#f39c12";
      case "low":
        return "#27ae60";
      default:
        return "#95a5a6";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #e3e3e3",
            borderTop: "4px solid #3498db",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "20px",
          }}
        >
          ⚠️
        </div>
        <h3
          style={{
            fontSize: "20px",
            marginBottom: "10px",
            color: "#e74c3c",
          }}
        >
          Error Loading Ticket
        </h3>
        <p
          style={{
            fontSize: "16px",
            color: "#6c757d",
            marginBottom: "20px",
          }}
        >
          {error}
        </p>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: "none",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ←
            </button>
          )}
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#2c3e50",
                margin: "0 0 5px 0",
              }}
            >
              Ticket #{ticket.id}
            </h1>
            <p
              style={{
                color: "#6c757d",
                margin: 0,
                fontSize: "14px",
              }}
            >
              Created {formatDate(ticket.created_at)} by{" "}
              {ticket.created_by.first_name} {ticket.created_by.last_name}
            </p>
          </div>
        </div>

        {onEdit && (
          <button
            onClick={() => onEdit(ticket)}
            style={{
              background: "#3498db",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Edit Ticket
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: "#fee",
            color: "#c33",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "14px",
            border: "1px solid #fcc",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
        }}
      >
        {/* Main Content */}
        <div>
          {/* Ticket Info */}
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              padding: "25px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#2c3e50",
                margin: "0 0 15px 0",
              }}
            >
              {ticket.title}
            </h2>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <span
                style={{
                  background: getColumnColor(ticket.column),
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "15px",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                {ticket.column?.name || "No Column"}
                {ticket.column?.track_time && (
                  <span style={{ marginLeft: "4px" }}>⏱️</span>
                )}
              </span>
              <span
                style={{
                  background: getPriorityColor(ticket.priority as any),
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "15px",
                  fontSize: "12px",
                  fontWeight: "500",
                  textTransform: "capitalize",
                }}
              >
                {(ticket.priority as any) || "None"} Priority
              </span>
            </div>

            <div
              style={{
                background: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                padding: "20px",
                lineHeight: "1.6",
                color: "#495057",
              }}
            >
              {(ticket.description_format as any) === "html" &&
              ticket.rich_description ? (
                <div
                  dangerouslySetInnerHTML={{ __html: ticket.rich_description }}
                />
              ) : (
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {ticket.description}
                </div>
              )}
            </div>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#6c757d",
                    margin: "0 0 10px 0",
                  }}
                >
                  Tags
                </h4>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {ticket.tags.map((tag) => (
                    <span
                      key={tag.id}
                      style={{
                        background: "#e9ecef",
                        color: "#495057",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist Items */}
            <ChecklistItemList
              ticketId={ticket.id}
              items={ticket.checklist_items || []}
              onItemsChange={fetchTicket}
            />
          </div>

          {/* Comments */}
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              padding: "25px",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#2c3e50",
                margin: "0 0 20px 0",
              }}
            >
              Comments ({ticket.comments_count})
            </h3>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} style={{ marginBottom: "30px" }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "12px",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "10px",
                }}
              >
                <button
                  type="submit"
                  disabled={!commentText.trim() || submittingComment}
                  style={{
                    background:
                      !commentText.trim() || submittingComment
                        ? "#dee2e6"
                        : "#27ae60",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor:
                      !commentText.trim() || submittingComment
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {submittingComment ? "Adding..." : "Add Comment"}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      padding: "15px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#495057",
                        }}
                      >
                        {comment.user.first_name} {comment.user.last_name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6c757d",
                        }}
                      >
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#495057",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {comment.comment}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#6c757d",
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "10px" }}>
                    💬
                  </div>
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Status Actions */}
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h4
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#2c3e50",
                margin: "0 0 15px 0",
              }}
            >
              Actions
            </h4>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#6c757d",
                  marginBottom: "5px",
                }}
              >
                Column
              </label>
              <select
                value={ticket.column?.id || ""}
                onChange={(e) => handleColumnChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #dee2e6",
                  borderRadius: "4px",
                  fontSize: "14px",
                  background: "white",
                }}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6c757d",
                  }}
                >
                  Assigned Users
                </label>

                {!editingAssignments && (
                  <button
                    onClick={handleStartEditingAssignments}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#3498db",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      textDecoration: "underline",
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingAssignments ? (
                <div>
                  <MultiUserAssignment
                    users={users}
                    assignments={ticket.assignments}
                    selectedAssignments={tempAssignments}
                    onChange={setTempAssignments}
                    placeholder="Assign users to this ticket..."
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "12px",
                    }}
                  >
                    <button
                      onClick={handleSaveAssignments}
                      style={{
                        background: "#27ae60",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: "pointer",
                        flex: 1,
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEditingAssignments}
                      style={{
                        background: "#6c757d",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: "pointer",
                        flex: 1,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <AssigneeList
                  assigned_to={ticket.assigned_to}
                  assigned_users={ticket.assigned_users}
                  assignments={ticket.assignments}
                  showRoles={true}
                  size="medium"
                />
              )}
            </div>
          </div>

          {/* Ticket Info */}
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              padding: "20px",
            }}
          >
            <h4
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#2c3e50",
                margin: "0 0 15px 0",
              }}
            >
              Ticket Information
            </h4>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6c757d",
                    marginBottom: "2px",
                  }}
                >
                  Created By
                </div>
                <div style={{ fontSize: "14px", color: "#495057" }}>
                  {ticket.created_by.first_name} {ticket.created_by.last_name}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6c757d",
                    marginBottom: "2px",
                  }}
                >
                  Assigned To
                </div>
                <div style={{ fontSize: "14px", color: "#495057" }}>
                  <AssigneeList
                    assigned_to={ticket.assigned_to}
                    assigned_users={ticket.assigned_users}
                    assignments={ticket.assignments}
                    showRoles={false}
                    size="small"
                    maxDisplay={3}
                  />
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6c757d",
                    marginBottom: "2px",
                  }}
                >
                  Created Date
                </div>
                <div style={{ fontSize: "14px", color: "#495057" }}>
                  {formatDate(ticket.created_at)}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6c757d",
                    marginBottom: "2px",
                  }}
                >
                  Last Updated
                </div>
                <div style={{ fontSize: "14px", color: "#495057" }}>
                  {formatDate(ticket.updated_at)}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6c757d",
                    marginBottom: "2px",
                  }}
                >
                  Progress
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#495057",
                    lineHeight: "1.4",
                  }}
                >
                  <div>
                    Checklist: {ticket.completed_checklist_items_count}/
                    {ticket.checklist_items_count}
                  </div>
                  <div>Comments: {ticket.comments_count}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Time Tracking */}
          <TimeTracking ticket={ticket} />
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
