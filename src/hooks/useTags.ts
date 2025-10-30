import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiTagsList, apiTagsCreate, apiTagsUpdate, apiTagsDestroy } from "@/api/generated";
import type { Tag, PatchedTag } from "@/api/generated";

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => apiTagsList(),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Tag, "id" | "created_at" | "created_by">) =>
      apiTagsCreate(data as Tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedTag }) =>
      apiTagsUpdate(id, data as Tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiTagsDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
