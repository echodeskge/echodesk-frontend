import {
  ticketsList,
  ticketsCreate,
  ticketsRetrieve,
  ticketsUpdate,
  ticketsPartialUpdate,
  ticketsDestroy,
  ticketsAddCommentCreate,
  ticketsAssignPartialUpdate,
  ticketsCommentsRetrieve,
  commentsCreate,
  commentsUpdate,
  commentsPartialUpdate,
  commentsDestroy,
  usersList,
  tagsList,
} from "../api/generated/api";

import {
  Ticket,
  TicketComment,
  User,
  PaginatedTicketListList,
  PaginatedUserList,
  PaginatedTagList,
  Tag,
  PatchedTicket,
  PriorityEnum,
} from "../api/generated/interfaces";

export interface TicketFilters {
  status?: "open" | "in_progress" | "resolved" | "closed";
  priority?: "low" | "medium" | "high" | "critical";
  assignedTo?: number;
  assignedGroup?: number;
  column?: number;
  createdBy?: number;
  tags?: number[];
  search?: string;
  page?: number;
  ordering?: string;
}

export interface CreateTicketData {
  title: string;
  description: string;
  rich_description?: any;
  description_format?: 'plain' | 'html' | 'delta';
  priority?: "low" | "medium" | "high" | "critical";
  assigned_to_id?: number;
  assigned_user_ids?: number[];
  assigned_group_ids?: number[];
  assignment_roles?: Record<string, string>;
  column_id?: number;
  tag_ids?: number[];
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  rich_description?: any;
  description_format?: 'plain' | 'html' | 'delta';
  status?: "open" | "in_progress" | "resolved" | "closed";
  priority?: "low" | "medium" | "high" | "critical";
  assigned_to_id?: number;
  assigned_user_ids?: number[];
  assigned_group_ids?: number[];
  assignment_roles?: Record<string, string>;
  column_id?: number;
  tag_ids?: number[];
}

export class TicketService {
  private static instance: TicketService;

  static getInstance(): TicketService {
    if (!TicketService.instance) {
      TicketService.instance = new TicketService();
    }
    return TicketService.instance;
  }

  /**
   * Get tickets list with optional filters
   */
  async getTickets(
    filters: TicketFilters = {}
  ): Promise<PaginatedTicketListList> {
    try {
      return await ticketsList(
        filters.assignedTo,
        filters.column,
        filters.createdBy,
        filters.ordering,
        filters.page,
        filters.priority,
        filters.search,
        filters.tags
      );
    } catch (error) {
      console.error("Error fetching tickets:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicket(id: number): Promise<Ticket> {
    try {
      return await ticketsRetrieve(id);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    try {
      // Create a simplified version for the API call
      const createData = {
        title: data.title,
        description: data.description,
        rich_description: data.rich_description,
        description_format: (data.description_format as any) || 'plain',
        priority: data.priority as unknown as PriorityEnum,
        assigned_to_id: data.assigned_to_id,
        assigned_user_ids: data.assigned_user_ids || [],
        assigned_group_ids: data.assigned_group_ids || [],
        assignment_roles: data.assignment_roles || {},
        column_id: data.column_id,
        tag_ids: data.tag_ids || [],
      };

      // Call the API with partial data, let backend fill the rest
      return await ticketsCreate(createData as unknown as Ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Update a ticket
   */
  async updateTicket(id: number, data: UpdateTicketData): Promise<Ticket> {
    try {
      // Cast the data to match the expected types
      const updateData: PatchedTicket = {
        title: data.title,
        description: data.description,
        rich_description: data.rich_description,
        description_format: (data.description_format as any) || 'plain',
        status: data.status,
        priority: data.priority as unknown as PriorityEnum,
        assigned_to_id: data.assigned_to_id,
        assigned_user_ids: data.assigned_user_ids || [],
        assigned_group_ids: data.assigned_group_ids || [],
        assignment_roles: data.assignment_roles || {},
        column_id: data.column_id,
        tag_ids: data.tag_ids,
      };

      return await ticketsPartialUpdate(id, updateData);
    } catch (error) {
      console.error("Error updating ticket:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(id: number): Promise<void> {
    try {
      await ticketsDestroy(id);
    } catch (error) {
      console.error("Error deleting ticket:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Assign ticket to a user
   */
  async assignTicket(ticketId: number, userId: number): Promise<Ticket> {
    try {
      return await ticketsAssignPartialUpdate(ticketId, {
        assigned_to_id: userId,
      });
    } catch (error) {
      console.error("Error assigning ticket:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Add comment to ticket
   */
  async addComment(ticketId: number, comment: string): Promise<TicketComment> {
    try {
      const commentData = {
        ticket: ticketId,
        comment,
        // These will be set by the backend
        id: 0,
        user: { id: 0, email: "", first_name: "", last_name: "" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return await commentsCreate(commentData);
    } catch (error) {
      console.error("Error adding comment:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    comment: string
  ): Promise<TicketComment> {
    try {
      return await commentsPartialUpdate(commentId, { comment });
    } catch (error) {
      console.error("Error updating comment:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      await commentsDestroy(commentId);
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Get comments for a ticket
   */
  async getTicketComments(ticketId: number): Promise<Ticket> {
    try {
      return await ticketsCommentsRetrieve(ticketId);
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all users for assignment
   */
  async getUsers(search?: string): Promise<PaginatedUserList> {
    try {
      return await usersList(
        undefined, // department
        undefined, // isActive
        search // search
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all tags
   */
  async getTags(search?: string): Promise<PaginatedTagList> {
    try {
      return await tagsList(undefined, undefined, search);
    } catch (error) {
      console.error("Error fetching tags:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Bulk assign users to multiple tickets
   */
  async bulkAssignTickets(
    ticketIds: number[], 
    userIds: number[], 
    roles: Record<string, string> = {},
    replace: boolean = false
  ): Promise<void> {
    try {
      // For now, update each ticket individually
      // In the future, this could be optimized with a dedicated bulk endpoint
      const promises = ticketIds.map(ticketId => {
        const assigned_user_ids = userIds;
        const assignment_roles = roles;
        const primaryAssignment = userIds.find(uid => roles[uid.toString()] === 'primary');
        const assigned_to_id = primaryAssignment || userIds[0];

        return this.updateTicket(ticketId, {
          assigned_to_id,
          assigned_user_ids,
          assignment_roles
        });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error("Error bulk assigning tickets:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Bulk unassign users from multiple tickets
   */
  async bulkUnassignTickets(ticketIds: number[], userIds?: number[]): Promise<void> {
    try {
      const promises = ticketIds.map(ticketId => {
        if (userIds && userIds.length > 0) {
          // Unassign specific users - this would need backend support
          // For now, we'll just clear all assignments if no userIds specified
          return this.updateTicket(ticketId, {
            assigned_to_id: undefined,
            assigned_user_ids: [],
            assignment_roles: {}
          });
        } else {
          // Clear all assignments
          return this.updateTicket(ticketId, {
            assigned_to_id: undefined,
            assigned_user_ids: [],
            assignment_roles: {}
          });
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error("Error bulk unassigning tickets:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { message?: string; detail?: string };
        };
      };
      if (axiosError.response?.status === 401) {
        return new Error("Authentication required");
      }
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.detail ||
        "API Error";
      return new Error(message);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error("Unknown error occurred");
  }
}

export const ticketService = TicketService.getInstance();
