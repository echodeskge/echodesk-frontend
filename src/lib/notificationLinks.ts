/**
 * Map a notification's backend `link_url` to a route the web dashboard has.
 *
 * Most links already match a page. The ecommerce_low_stock digest for a
 * single product links to /ecommerce/products/<id>, which has no page of its
 * own: open the products list with that product's edit sheet instead.
 */
export function webRouteForNotificationLink(linkUrl: string): string {
  const product = linkUrl.match(/^\/ecommerce\/products\/(\d+)\/?(?:[?#].*)?$/)
  if (product) {
    return `/ecommerce/products?edit=${product[1]}`
  }
  return linkUrl
}

/**
 * Where clicking a notification goes: the ticket detail when the
 * notification carries `ticket_id`, otherwise its own in-app `link_url`
 * (mapped by `webRouteForNotificationLink`). Returns null when there is
 * nowhere to go (no ticket and no relative link). This is the rule the tenant
 * layout's bell handler and the in-app toast both follow.
 */
export function notificationRoute(notification: {
  ticket_id?: number | string | null
  link_url?: string | null
}): string | null {
  if (notification.ticket_id) {
    return `/tickets/${notification.ticket_id}`
  }
  const linkUrl = notification.link_url
  if (linkUrl && linkUrl.startsWith('/')) {
    return webRouteForNotificationLink(linkUrl)
  }
  return null
}
