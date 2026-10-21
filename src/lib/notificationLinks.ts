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
