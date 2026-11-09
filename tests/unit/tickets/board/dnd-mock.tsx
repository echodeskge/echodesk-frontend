/**
 * A pass-through stand-in for `@hello-pangea/dnd` so board tests can render
 * columns and cards and call the DragDropContext handlers directly.
 *
 *   const dnd = vi.hoisted(() => ({ ctx: null, over: null }) as DndState);
 *   vi.mock("@hello-pangea/dnd", async () => (await import("./dnd-mock")).createDndMock(dnd));
 */
import type { ReactNode } from "react";

export interface DndState {
  /** The latest DragDropContext props (onDragStart / onDragEnd). */
  ctx: {
    onBeforeCapture?: (before: unknown) => void;
    onDragStart?: (start: unknown) => void;
    onDragEnd?: (result: unknown) => void;
  } | null;
  /** droppableId reported as `isDraggingOver`. */
  over: string | null;
}

type Render = (provided: Record<string, unknown>, snapshot: Record<string, unknown>) => ReactNode;

export function createDndMock(state: DndState) {
  return {
    DragDropContext: (props: { children: ReactNode; onDragStart?: () => void; onDragEnd?: () => void }) => {
      state.ctx = props as DndState["ctx"];
      return <>{props.children}</>;
    },
    Droppable: ({
      children,
      droppableId,
      isDropDisabled,
      type,
    }: {
      children: Render;
      droppableId: string;
      isDropDisabled?: boolean;
      type?: string;
    }) =>
      children(
        {
          innerRef: () => {},
          droppableProps: {
            "data-droppable-id": droppableId,
            "data-droppable-type": type,
            "data-drop-disabled": String(!!isDropDisabled),
          },
          placeholder: null,
        },
        { isDraggingOver: state.over === droppableId },
      ),
    Draggable: ({
      children,
      draggableId,
      isDragDisabled,
    }: {
      children: Render;
      draggableId: string;
      isDragDisabled?: boolean;
    }) =>
      children(
        {
          innerRef: () => {},
          draggableProps: { "data-draggable-id": draggableId, "data-drag-disabled": String(!!isDragDisabled), style: {} },
          dragHandleProps: { "data-drag-handle": draggableId, tabIndex: 0 },
        },
        { isDragging: false },
      ),
  };
}
