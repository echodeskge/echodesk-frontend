"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ecommerceAdminClientsList } from "@/api/generated"
import { EcommerceClientList } from "@/api/generated/interfaces"
import { toast } from "sonner"
import { ClientsTable } from "./_components/clients-table"

const DEFAULT_PAGE_SIZE = 20

export default function ClientsPage() {
  const t = useTranslations("clients")
  const [clients, setClients] = useState<EcommerceClientList[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const isActive =
        statusFilter === "active"
          ? true
          : statusFilter === "inactive"
            ? false
            : undefined
      const response = await ecommerceAdminClientsList(
        isActive,
        undefined,
        undefined,
        page,
        pageSize,
        searchQuery || undefined
      )
      setClients(response.results || [])
      setTotalCount(response.count || 0)
    } catch {
      toast.error("Failed to load clients")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, page, pageSize])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setPage(1)
  }, [])

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }, [])

  return (
    <section className="container p-4">
      <ClientsTable
        data={clients}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        loading={loading}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={handleStatusFilterChange}
        t={t}
      />
    </section>
  )
}
