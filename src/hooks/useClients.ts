import { useQuery } from "@tanstack/react-query";
import axios from "@/api/axios";
import type { PaginatedEcommerceClientList } from "@/api/generated/interfaces";

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
    queryFn: async () => {
      const response = await axios.get<PaginatedEcommerceClientList>(
        "/api/ecommerce/clients/",
        { params }
      );
      return response.data;
    },
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const response = await axios.get(`/api/ecommerce/clients/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
}
