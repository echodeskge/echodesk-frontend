import { useQuery } from "@tanstack/react-query";
import {
  ecommerceAdminClientsList,
  ecommerceAdminClientsRetrieve
} from "@/api/generated";
import type { PaginatedEcommerceClientListList } from "@/api/generated/interfaces";

interface UseClientsParams {
  search?: string;
  is_active?: boolean;
  is_verified?: boolean;
  page?: number;
  page_size?: number;
}

export function useClients(params?: UseClientsParams) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: () => ecommerceAdminClientsList(
      params?.is_active,
      params?.is_verified,
      params?.search,
      params?.page
    ),
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: () => ecommerceAdminClientsRetrieve(id),
    enabled: !!id,
  });
}
