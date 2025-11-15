import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { ecommerceClientProductsList } from "@/api/generated";
import type { PaginatedProductListList } from "@/api/generated";

/**
 * Product list filter parameters
 */
export interface ProductListFilters {
  // Basic filters
  isFeatured?: boolean;
  search?: string;
  language?: string;

  // Price filters
  minPrice?: number;
  maxPrice?: number;

  // Pagination & ordering
  page?: number;
  ordering?: string;

  // Dynamic attribute filters
  // These will be any additional properties starting with 'attr_'
  [key: `attr_${string}`]: string | undefined;
}

/**
 * Hook to fetch client-facing products with filtering
 *
 * @example
 * // Basic usage
 * const { data } = useClientProducts({ isFeatured: true, page: 1 });
 *
 * @example
 * // With attribute filters
 * const { data } = useClientProducts({
 *   attr_color: 'red,blue',
 *   attr_size: 'large',
 *   minPrice: 10,
 *   maxPrice: 100,
 * });
 */
export function useClientProducts(
  filters?: ProductListFilters,
  options?: Omit<UseQueryOptions<PaginatedProductListList>, "queryKey" | "queryFn">
) {
  return useQuery<PaginatedProductListList>({
    queryKey: ["client-products", filters],
    queryFn: async () => {
      if (!filters) {
        return ecommerceClientProductsList();
      }

      // Extract standard parameters
      const {
        isFeatured,
        search,
        language,
        minPrice,
        maxPrice,
        page,
        ordering,
        ...attributeFilters
      } = filters;

      // Build query string with attribute filters
      const params = new URLSearchParams();

      // Add standard parameters
      if (isFeatured !== undefined) params.append("is_featured", String(isFeatured));
      if (search) params.append("search", search);
      if (language) params.append("language", language);
      if (minPrice !== undefined) params.append("min_price", String(minPrice));
      if (maxPrice !== undefined) params.append("max_price", String(maxPrice));
      if (page !== undefined) params.append("page", String(page));
      if (ordering) params.append("ordering", ordering);

      // Add dynamic attribute filters
      Object.entries(attributeFilters).forEach(([key, value]) => {
        if (value !== undefined && key.startsWith("attr_")) {
          params.append(key, String(value));
        }
      });

      // Make the API call
      const queryString = params.toString();
      const url = `/api/ecommerce/client/products/${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      return response.json();
    },
    ...options,
  });
}
