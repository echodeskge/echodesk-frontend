/**
 * Language Management Service
 */

import axiosInstance from "@/api/axios";
import type { Language, PaginatedLanguageList, PatchedLanguage } from "@/api/generated";

export interface LanguageFilters {
  is_active?: boolean;
  ordering?: string;
}

class LanguageService {
  private basePath = "/api/ecommerce/languages";

  async getLanguages(filters?: LanguageFilters): Promise<PaginatedLanguageList> {
    const params = new URLSearchParams();

    if (filters?.is_active !== undefined) {
      params.append("is_active", String(filters.is_active));
    }
    if (filters?.ordering) {
      params.append("ordering", filters.ordering);
    }

    const queryString = params.toString();
    const url = queryString ? `${this.basePath}/?${queryString}` : `${this.basePath}/`;

    const response = await axiosInstance.get<PaginatedLanguageList>(url);
    return response.data;
  }

  async getLanguage(id: number): Promise<Language> {
    const response = await axiosInstance.get<Language>(`${this.basePath}/${id}/`);
    return response.data;
  }

  async createLanguage(data: Omit<Language, "id" | "created_at" | "updated_at">): Promise<Language> {
    const response = await axiosInstance.post<Language>(`${this.basePath}/`, data);
    return response.data;
  }

  async updateLanguage(id: number, data: PatchedLanguage): Promise<Language> {
    const response = await axiosInstance.patch<Language>(`${this.basePath}/${id}/`, data);
    return response.data;
  }

  async deleteLanguage(id: number): Promise<void> {
    await axiosInstance.delete(`${this.basePath}/${id}/`);
  }
}

export const languageService = new LanguageService();
