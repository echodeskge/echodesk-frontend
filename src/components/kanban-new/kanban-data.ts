import type { ColumnType } from "./types"

export const kanbanData: ColumnType[] = [
  {
    id: "backlog",
    title: "Backlog",
    order: 0,
    tasks: [
      {
        id: "task-0",
        columnId: "backlog",
        order: 0,
        title: "Research Market Trends",
        description: "Conduct initial research on market trends and competitor analysis.",
        label: "Research",
        assigned: [
          {
            id: "member-0",
            username: "john.doe",
            name: "John Doe",
          },
          {
            id: "member-1",
            username: "emily.smith",
            name: "Emily Smith",
          },
        ],
        dueDate: new Date(2024, 11, 15),
        attachments: [
          {
            name: "research-report.pdf",
            url: "/research-report.pdf",
            type: "application/pdf",
          },
        ],
        comments: [
          {
            id: "comment-0",
            userId: "member-0",
            text: "Let's start gathering data from industry reports.",
            createdAt: new Date(),
          },
          {
            id: "comment-1",
            userId: "member-1",
            text: "I'll check the latest market statistics.",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "task-1",
        columnId: "backlog",
        order: 1,
        title: "Design System Setup",
        description: "Create a wireframe and design system for the new feature.",
        label: "Design",
        assigned: [
          {
            id: "member-2",
            username: "michael.brown",
            name: "Michael Brown",
          },
        ],
        dueDate: new Date(2024, 11, 20),
        attachments: [],
        comments: [
          {
            id: "comment-2",
            userId: "member-2",
            text: "Starting with color palette and typography.",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "task-2",
        columnId: "backlog",
        order: 2,
        title: "Database Schema Design",
        description: "Plan and design the database architecture for the new module.",
        label: "Backend",
        assigned: [
          {
            id: "member-3",
            username: "sarah.johnson",
            name: "Sarah Johnson",
          },
        ],
        dueDate: new Date(2024, 11, 18),
        attachments: [],
        comments: [],
      },
      {
        id: "task-3",
        columnId: "backlog",
        order: 3,
        title: "User Testing Plan",
        description: "Create a comprehensive user testing strategy.",
        label: "QA",
        assigned: [
          {
            id: "member-4",
            username: "olivia.martinez",
            name: "Olivia Martinez",
          },
        ],
        dueDate: new Date(2024, 11, 22),
        attachments: [],
        comments: [],
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    order: 1,
    tasks: [
      {
        id: "task-10",
        columnId: "in-progress",
        order: 0,
        title: "Develop Authentication API",
        description: "Build the REST API endpoints for user authentication and authorization.",
        label: "Development",
        assigned: [
          {
            id: "member-2",
            username: "michael.brown",
            name: "Michael Brown",
          },
          {
            id: "member-3",
            username: "sarah.johnson",
            name: "Sarah Johnson",
          },
        ],
        dueDate: new Date(2024, 11, 10),
        attachments: [
          {
            name: "api-specs.pdf",
            url: "/api-specs.pdf",
            type: "application/pdf",
          },
        ],
        comments: [
          {
            id: "comment-10",
            userId: "member-2",
            text: "JWT implementation is complete.",
            createdAt: new Date(),
          },
          {
            id: "comment-11",
            userId: "member-3",
            text: "Working on OAuth integration now.",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "task-11",
        columnId: "in-progress",
        order: 1,
        title: "Update Dashboard UI",
        description: "Revise the user interface for better UX and accessibility.",
        label: "Design",
        assigned: [
          {
            id: "member-0",
            username: "john.doe",
            name: "John Doe",
          },
        ],
        dueDate: new Date(2024, 11, 12),
        attachments: [],
        comments: [
          {
            id: "comment-12",
            userId: "member-0",
            text: "New color scheme looks great!",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "task-12",
        columnId: "in-progress",
        order: 2,
        title: "Mobile Responsive Design",
        description: "Ensure all pages work perfectly on mobile devices.",
        label: "Frontend",
        assigned: [
          {
            id: "member-1",
            username: "emily.smith",
            name: "Emily Smith",
          },
        ],
        dueDate: new Date(2024, 11, 14),
        attachments: [],
        comments: [],
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    order: 2,
    tasks: [
      {
        id: "task-20",
        columnId: "review",
        order: 0,
        title: "Code Review - Payment Module",
        description: "Review the payment integration code for security and best practices.",
        label: "Review",
        assigned: [
          {
            id: "member-3",
            username: "sarah.johnson",
            name: "Sarah Johnson",
          },
          {
            id: "member-4",
            username: "olivia.martinez",
            name: "Olivia Martinez",
          },
        ],
        dueDate: new Date(2024, 11, 8),
        attachments: [],
        comments: [
          {
            id: "comment-20",
            userId: "member-3",
            text: "Need to add more error handling.",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "task-21",
        columnId: "review",
        order: 1,
        title: "Performance Testing",
        description: "Run performance tests on the new features.",
        label: "QA",
        assigned: [
          {
            id: "member-4",
            username: "olivia.martinez",
            name: "Olivia Martinez",
          },
        ],
        dueDate: new Date(2024, 11, 9),
        attachments: [
          {
            name: "test-results.pdf",
            url: "/test-results.pdf",
            type: "application/pdf",
          },
        ],
        comments: [],
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    order: 3,
    tasks: [
      {
        id: "task-30",
        columnId: "done",
        order: 0,
        title: "Write Technical Documentation",
        description: "Prepare comprehensive technical documentation for the release.",
        label: "Documentation",
        assigned: [
          {
            id: "member-2",
            username: "michael.brown",
            name: "Michael Brown",
          },
          {
            id: "member-0",
            username: "john.doe",
            name: "John Doe",
          },
        ],
        dueDate: new Date(2024, 10, 30),
        attachments: [
          {
            name: "project-docs.pdf",
            url: "/project-docs.pdf",
            type: "application/pdf",
          },
        ],
        comments: [
          {
            id: "comment-30",
            userId: "member-2",
            text: "Documentation is complete and reviewed!",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "task-31",
        columnId: "done",
        order: 1,
        title: "Fix Critical Bugs",
        description: "Resolve all critical bugs reported in the last sprint.",
        label: "Bug Fix",
        assigned: [
          {
            id: "member-0",
            username: "john.doe",
            name: "John Doe",
          },
          {
            id: "member-1",
            username: "emily.smith",
            name: "Emily Smith",
          },
        ],
        dueDate: new Date(2024, 10, 28),
        attachments: [
          {
            name: "bug-report.pdf",
            url: "/bug-report.pdf",
            type: "application/pdf",
          },
        ],
        comments: [
          {
            id: "comment-31",
            userId: "member-1",
            text: "All bugs have been fixed and tested.",
            createdAt: new Date(),
          },
          {
            id: "comment-32",
            userId: "member-0",
            text: "Great teamwork!",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "task-32",
        columnId: "done",
        order: 2,
        title: "Deploy to Staging",
        description: "Successfully deployed the application to staging environment.",
        label: "DevOps",
        assigned: [
          {
            id: "member-3",
            username: "sarah.johnson",
            name: "Sarah Johnson",
          },
        ],
        dueDate: new Date(2024, 10, 25),
        attachments: [],
        comments: [
          {
            id: "comment-33",
            userId: "member-3",
            text: "Staging deployment successful!",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "task-33",
        columnId: "done",
        order: 3,
        title: "Setup CI/CD Pipeline",
        description: "Configure automated testing and deployment pipeline.",
        label: "DevOps",
        assigned: [
          {
            id: "member-3",
            username: "sarah.johnson",
            name: "Sarah Johnson",
          },
          {
            id: "member-2",
            username: "michael.brown",
            name: "Michael Brown",
          },
        ],
        dueDate: new Date(2024, 10, 20),
        attachments: [],
        comments: [],
      },
    ],
  },
]
