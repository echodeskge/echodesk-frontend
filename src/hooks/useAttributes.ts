/**
 * Product Attribute Management Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attributeService, AttributeFilters } from "@/services/attributeService";
import type {
  AttributeDefinition,
  PatchedAttributeDefinitionRequest,
} from "@/api/generated";

export function useAttributes(filters?: AttributeFilters) {
  return useQuery({
    queryKey: ["attributes", filters],
    queryFn: () => attributeService.getAttributes(filters),
  });
}

export function useAttribute(id: number) {
  return useQuery({
    queryKey: ["attribute", id],
    queryFn: () => attributeService.getAttribute(id),
    enabled: !!id,
  });
}

export function useCreateAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AttributeDefinition) =>
      attributeService.createAttribute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
    },
  });
}

export function useUpdateAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: PatchedAttributeDefinitionRequest;
    }) => attributeService.updateAttribute(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      queryClient.invalidateQueries({ queryKey: ["attribute", variables.id] });
    },
  });
}

export function useDeleteAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => attributeService.deleteAttribute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
    },
  });
}
