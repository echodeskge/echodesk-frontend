/**
 * Language Management Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { languageService, LanguageFilters } from "@/services/languageService";
import type { Language, PatchedLanguageRequest } from "@/api/generated";

export function useLanguages(filters?: LanguageFilters) {
  return useQuery({
    queryKey: ["languages", filters],
    queryFn: () => languageService.getLanguages(filters),
  });
}

export function useLanguage(id: number) {
  return useQuery({
    queryKey: ["language", id],
    queryFn: () => languageService.getLanguage(id),
    enabled: !!id,
  });
}

export function useCreateLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Language, "id" | "created_at" | "updated_at">) =>
      languageService.createLanguage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["languages"] });
    },
  });
}

export function useUpdateLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: PatchedLanguageRequest;
    }) => languageService.updateLanguage(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["languages"] });
      queryClient.invalidateQueries({ queryKey: ["language", variables.id] });
    },
  });
}

export function useDeleteLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => languageService.deleteLanguage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["languages"] });
    },
  });
}
