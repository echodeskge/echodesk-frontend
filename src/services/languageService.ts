/**
 * Language Management Service
 */

import {
  apiEcommerceAdminLanguagesList,
  apiEcommerceAdminLanguagesRetrieve,
  apiEcommerceAdminLanguagesCreate,
  apiEcommerceAdminLanguagesPartialUpdate,
  apiEcommerceAdminLanguagesDestroy
} from "@/api/generated";
import type { Language, PaginatedLanguageList, PatchedLanguage } from "@/api/generated";

export interface LanguageFilters {
  ordering?: string;
  page?: number;
}

class LanguageService {
  async getLanguages(filters?: LanguageFilters): Promise<PaginatedLanguageList> {
    return apiEcommerceAdminLanguagesList(
      filters?.ordering,
      filters?.page
    );
  }

  async getLanguage(id: number): Promise<Language> {
    return apiEcommerceAdminLanguagesRetrieve(id);
  }

  async createLanguage(data: Omit<Language, "id" | "created_at" | "updated_at">): Promise<Language> {
    return apiEcommerceAdminLanguagesCreate(data as Language);
  }

  async updateLanguage(id: number, data: PatchedLanguage): Promise<Language> {
    return apiEcommerceAdminLanguagesPartialUpdate(id, data);
  }

  async deleteLanguage(id: number): Promise<void> {
    await apiEcommerceAdminLanguagesDestroy(id);
  }
}

export const languageService = new LanguageService();
