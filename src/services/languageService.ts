/**
 * Language Management Service
 */

import {
  ecommerceAdminLanguagesList,
  ecommerceAdminLanguagesRetrieve,
  ecommerceAdminLanguagesCreate,
  ecommerceAdminLanguagesPartialUpdate,
  ecommerceAdminLanguagesDestroy
} from "@/api/generated";
import type { Language, PaginatedLanguageList, PatchedLanguageRequest } from "@/api/generated";

export interface LanguageFilters {
  ordering?: string;
  page?: number;
}

class LanguageService {
  async getLanguages(filters?: LanguageFilters): Promise<PaginatedLanguageList> {
    return ecommerceAdminLanguagesList(
      filters?.ordering,
      filters?.page
    );
  }

  async getLanguage(id: number): Promise<Language> {
    return ecommerceAdminLanguagesRetrieve(id);
  }

  async createLanguage(data: Omit<Language, "id" | "created_at" | "updated_at">): Promise<Language> {
    return ecommerceAdminLanguagesCreate(data as Language);
  }

  async updateLanguage(id: number, data: PatchedLanguageRequest): Promise<Language> {
    return ecommerceAdminLanguagesPartialUpdate(id, data);
  }

  async deleteLanguage(id: number): Promise<void> {
    await ecommerceAdminLanguagesDestroy(id);
  }
}

export const languageService = new LanguageService();
