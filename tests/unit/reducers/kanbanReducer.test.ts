/**
 * Tests for KanbanReducer.
 * Pure function tests — no mocks needed.
 * Mirrors backend kanban board state management.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KanbanReducer } from "@/components/kanban-new/kanban-reducer";
import type {
  KanbanStateType,
  ColumnType,
  TaskType,
  KanbanActionType,
} from "@/components/kanban-new/types";

// Stable UUID mock for predictable test assertions
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `uuid-${++uuidCounter}`,
});

function makeColumn(overrides: Partial<ColumnType> = {}): ColumnType {
  return {
    id: "col-1",
    order: 0,
    title: "To Do",
    tasks: [],
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskType> = {}): TaskType {
  return {
    id: "task-1",
    columnId: "col-1",
    order: 0,
    title: "Test task",
    label: "bug",
    comments: [],
    assigned: [],
    dueDate: new Date("2024-01-01"),
    attachments: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<KanbanStateType> = {}): KanbanStateType {
  return {
    columns: [],
    teamMembers: [],
    ...overrides,
  };
}

describe("KanbanReducer", () => {
  beforeEach(() => {
    uuidCounter = 0;
  });

  // -- addColumn --
  describe("addColumn", () => {
    it("adds a column with generated ID and correct order", () => {
      const state = makeState({ columns: [makeColumn()] });
      const result = KanbanReducer(state, {
        type: "addColumn",
        column: { title: "In Progress" },
      });

      expect(result.columns).toHaveLength(2);
      expect(result.columns[1].id).toBe("uuid-1");
      expect(result.columns[1].order).toBe(1);
      expect(result.columns[1].title).toBe("In Progress");
    });

    it("initializes new column with empty tasks array", () => {
      const state = makeState();
      const result = KanbanReducer(state, {
        type: "addColumn",
        column: { title: "Done" },
      });

      expect(result.columns[0].tasks).toEqual([]);
    });
  });

  // -- updateColumn --
  describe("updateColumn", () => {
    it("updates the matching column", () => {
      const col = makeColumn({ id: "col-1", title: "To Do" });
      const state = makeState({ columns: [col] });
      const updated = { ...col, title: "Backlog" };

      const result = KanbanReducer(state, {
        type: "updateColumn",
        column: updated,
      });

      expect(result.columns[0].title).toBe("Backlog");
    });

    it("does not modify other columns", () => {
      const col1 = makeColumn({ id: "col-1", title: "To Do" });
      const col2 = makeColumn({ id: "col-2", title: "Done", order: 1 });
      const state = makeState({ columns: [col1, col2] });

      const result = KanbanReducer(state, {
        type: "updateColumn",
        column: { ...col1, title: "Backlog" },
      });

      expect(result.columns[1].title).toBe("Done");
    });
  });

  // -- deleteColumn --
  describe("deleteColumn", () => {
    it("removes column by ID", () => {
      const col = makeColumn({ id: "col-1" });
      const state = makeState({ columns: [col] });

      const result = KanbanReducer(state, {
        type: "deleteColumn",
        columnId: "col-1",
      });

      expect(result.columns).toHaveLength(0);
    });

    it("no-op for unknown column ID", () => {
      const col = makeColumn({ id: "col-1" });
      const state = makeState({ columns: [col] });

      const result = KanbanReducer(state, {
        type: "deleteColumn",
        columnId: "unknown",
      });

      expect(result.columns).toHaveLength(1);
    });
  });

  // -- syncColumns --
  describe("syncColumns", () => {
    it("replaces all columns with provided data", () => {
      const state = makeState({ columns: [makeColumn()] });
      const newColumns = [
        makeColumn({ id: "new-1", title: "Alpha" }),
        makeColumn({ id: "new-2", title: "Beta", order: 1 }),
      ];

      const result = KanbanReducer(state, {
        type: "syncColumns",
        columns: newColumns,
      });

      expect(result.columns).toHaveLength(2);
      expect(result.columns[0].title).toBe("Alpha");
      expect(result.columns[1].title).toBe("Beta");
    });
  });

  // -- addTask --
  describe("addTask", () => {
    it("adds task to the correct column with generated ID", () => {
      const col = makeColumn({ id: "col-1" });
      const state = makeState({ columns: [col] });

      const result = KanbanReducer(state, {
        type: "addTask",
        columnId: "col-1",
        task: {
          title: "New task",
          label: "feature",
          comments: [],
          assigned: [],
          dueDate: new Date(),
          attachments: [],
        },
      });

      expect(result.columns[0].tasks).toHaveLength(1);
      expect(result.columns[0].tasks[0].id).toBe("uuid-1");
      expect(result.columns[0].tasks[0].columnId).toBe("col-1");
      expect(result.columns[0].tasks[0].order).toBe(0);
    });
  });

  // -- deleteTask --
  describe("deleteTask", () => {
    it("removes task from its column", () => {
      const task = makeTask({ id: "task-1" });
      const col = makeColumn({ id: "col-1", tasks: [task] });
      const state = makeState({ columns: [col] });

      const result = KanbanReducer(state, {
        type: "deleteTask",
        taskId: "task-1",
      });

      expect(result.columns[0].tasks).toHaveLength(0);
    });
  });

  // -- reorderColumns --
  describe("reorderColumns", () => {
    it("moves column and reassigns order values", () => {
      const col1 = makeColumn({ id: "col-1", title: "A", order: 0 });
      const col2 = makeColumn({ id: "col-2", title: "B", order: 1 });
      const col3 = makeColumn({ id: "col-3", title: "C", order: 2 });
      const state = makeState({ columns: [col1, col2, col3] });

      // Move first column to last position
      const result = KanbanReducer(state, {
        type: "reorderColumns",
        sourceIndex: 0,
        destinationIndex: 2,
      });

      expect(result.columns[0].id).toBe("col-2");
      expect(result.columns[1].id).toBe("col-3");
      expect(result.columns[2].id).toBe("col-1");
      // Order values should be sequential
      expect(result.columns.map((c) => c.order)).toEqual([0, 1, 2]);
    });
  });

  // -- reorderTasks --
  describe("reorderTasks", () => {
    it("reorders within the same column", () => {
      const task1 = makeTask({ id: "t1", order: 0 });
      const task2 = makeTask({ id: "t2", order: 1 });
      const col = makeColumn({ id: "col-1", tasks: [task1, task2] });
      const state = makeState({ columns: [col] });

      const result = KanbanReducer(state, {
        type: "reorderTasks",
        source: { columnId: "col-1", index: 0 },
        destination: { columnId: "col-1", index: 1 },
      });

      expect(result.columns[0].tasks[0].id).toBe("t2");
      expect(result.columns[0].tasks[1].id).toBe("t1");
      expect(result.columns[0].tasks.map((t) => t.order)).toEqual([0, 1]);
    });

    it("moves task across different columns", () => {
      const task = makeTask({ id: "t1", columnId: "col-1" });
      const col1 = makeColumn({ id: "col-1", tasks: [task] });
      const col2 = makeColumn({ id: "col-2", order: 1, title: "Done", tasks: [] });
      const state = makeState({ columns: [col1, col2] });

      const result = KanbanReducer(state, {
        type: "reorderTasks",
        source: { columnId: "col-1", index: 0 },
        destination: { columnId: "col-2", index: 0 },
      });

      expect(result.columns[0].tasks).toHaveLength(0);
      expect(result.columns[1].tasks).toHaveLength(1);
      expect(result.columns[1].tasks[0].id).toBe("t1");
    });
  });

  // -- selectTask / selectColumn --
  describe("selectTask", () => {
    it("sets selected task", () => {
      const task = makeTask();
      const state = makeState();

      const result = KanbanReducer(state, {
        type: "selectTask",
        task,
      });

      expect(result.selectedTask).toBe(task);
    });
  });

  describe("selectColumn", () => {
    it("sets selected column", () => {
      const col = makeColumn();
      const state = makeState();

      const result = KanbanReducer(state, {
        type: "selectColumn",
        column: col,
      });

      expect(result.selectedColumn).toBe(col);
    });
  });
});
