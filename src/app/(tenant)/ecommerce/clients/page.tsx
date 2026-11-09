"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { EcommerceClientList } from "@/api/generated/interfaces"
import { toast } from "sonner"
import { EcPage, EcommerceHeaderBridge } from "../_components/ui"
import { ClientsTable } from "./_components/clients-table"
import { fetchEcommerceClients } from "./_lib/fetch-clients"

const DEFAULT_PAGE_SIZE = 20

export default function ClientsPage() {
  const t = useTranslations("clients")
  const [clients, setClients] = useState<EcommerceClientList[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const isActive =
        statusFilter === "active"
          ? true
          : statusFilter === "inactive"
            ? false
            : undefined
      const response = await fetchEcommerceClients({
        isActive,
        page,
        pageSize,
        search: searchQuery || undefined,
      })
      setClients(response.results || [])
      setTotalCount(response.count || 0)
    } catch (err) {
      setError(err)
      toast.error(t("loadError"))
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, page, pageSize, t])

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
    <>
      <EcommerceHeaderBridge sub={error || (loading && totalCount === 0) ? null : t("count", { count: totalCount })} />
      <EcPage fill testId="clients-page">
        <ClientsTable
          data={clients}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          loading={loading}
          error={error}
          onRetry={fetchClients}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
          t={t}
        />
      </EcPage>
    </>
  )
}
