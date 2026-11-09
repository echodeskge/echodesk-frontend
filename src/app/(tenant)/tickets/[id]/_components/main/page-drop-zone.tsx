"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "../../../_components/header/use-media-query";
import { dragHasFiles } from "./main-utils";

/** Phones and tablets: no hover and a coarse pointer. */
export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

export function useTouchDevice(): boolean {
  return useMediaQuery(TOUCH_QUERY);
}

/**
 * The whole page accepts dropped files (desktop only; touch devices use the
 * Upload button). Only drags that carry OS files count, so text drags and the
 * checklist's reorder drag (pointer events, no DataTransfer) are ignored.
 * While files hover the window, `dragging` is true; a drop hands the files
 * over and stops the browser from opening them.
 */
export function usePageDropZone({ enabled, onFiles }: { enabled: boolean; onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const reset = () => {
      depth.current = 0;
      setDragging(false);
    };
    const onEnter = (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      depth.current = Math.max(0, depth.current - 1);
      // relatedTarget null = the pointer left the window.
      if (depth.current === 0 || e.relatedTarget === null) reset();
    };
    const onDrop = (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      reset();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) onFilesRef.current(files);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", reset);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", reset);
      reset();
    };
  }, [enabled]);

  return { dragging: enabled && dragging };
}

/** The full-page overlay shown while files hover the window. */
export function PageDropOverlay({ visible }: { visible: boolean }) {
  const t = useTranslations("ticketsScreen.attachments");
  if (!visible || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-testid="page-drop-overlay"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-6 backdrop-blur-[1px]"
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 text-sm font-medium text-foreground">
        <Upload aria-hidden="true" size={22} className="text-primary" />
        {t("dropHere")}
      </div>
    </div>,
    document.body,
  );
}
