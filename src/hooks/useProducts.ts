/**
 * Product Management Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService, ProductFilters } from "@/services/productService";
import type {
  ProductDetail,
  ProductCreateUpdate,
  PatchedProductCreateUpdate,
} from "@/api/generated";

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => productService.getProducts(filters),
  });
}

export function useProduct(id: number, language?: string) {
  return useQuery({
    queryKey: ["product", id, language],
    queryFn: () => productService.getProduct(id, language),
    enabled: !!id,
  });
}

export function useFeaturedProducts(language?: string) {
  return useQuery({
    queryKey: ["products", "featured", language],
    queryFn: () => productService.getFeaturedProducts(language),
  });
}

export function useLowStockProducts(language?: string) {
  return useQuery({
    queryKey: ["products", "low-stock", language],
    queryFn: () => productService.getLowStockProducts(language),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductCreateUpdate) =>
      productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: PatchedProductCreateUpdate;
    }) => productService.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useProductTypes(filters?: any) {
  return useQuery({
    queryKey: ["product-types", filters],
    queryFn: () => productService.getProductTypes(filters),
  });
}

export function useProductCategories(filters?: any) {
  return useQuery({
    queryKey: ["product-categories", filters],
    queryFn: () => productService.getCategories(filters),
  });
}

export function useCategoryTree(language?: string) {
  return useQuery({
    queryKey: ["product-categories", "tree", language],
    queryFn: () => productService.getCategoryTree(language),
  });
}

export function useAttributes(filters?: any) {
  return useQuery({
    queryKey: ["product-attributes", filters],
    queryFn: () => productService.getAttributes(filters),
  });
}
