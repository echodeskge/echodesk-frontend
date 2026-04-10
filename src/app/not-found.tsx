import { getTranslations } from "next-intl/server"

import { NotFound404 } from "@/components/pages/not-found-404"

export default async function NotFoundPage() {
  const t = await getTranslations("notFound")

  return (
    <NotFound404
      copy={{
        title: t("title"),
        subtitle: t("subtitle"),
        description: t("description"),
        homeButton: t("homeButton"),
      }}
    />
  )
}
