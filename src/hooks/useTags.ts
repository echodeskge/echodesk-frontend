import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsList, tagsCreate, tagsUpdate, tagsDestroy } from "@/api/generated";
import type { Tag, PatchedTag } from "@/api/generated";

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => tagsList(),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Tag, "id" | "created_at" | "created_by">) =>
      tagsCreate(data as Tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedTag }) =>
      tagsUpdate(id, data as Tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => tagsDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
