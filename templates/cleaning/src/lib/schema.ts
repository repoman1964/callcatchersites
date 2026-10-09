// JSON-LD builders. Shapes match the source build: LocalBusiness on every page,
// plus Service / FAQPage / BreadcrumbList where the page has them.
import { biz, site, areas, reviews, categories, absUrl, type Faq } from './site';

const businessId = `${biz.url}/#business`;
const areaServed = areas.map((a) => ({ '@type': 'AdministrativeArea', name: a.name }));
const provider = { '@type': biz.schema_types, '@id': businessId, name: biz.name };

export function localBusiness() {
  return {
    '@context': 'https://schema.org',
    '@type': biz.schema_types,
    '@id': businessId,
    name: biz.name,
    description: biz.description,
    url: biz.url,
    telephone: biz.phone_e164,
    ...(biz.email && { email: biz.email }),
    address: { '@type': 'PostalAddress', ...biz.address },
    ...(biz.geo?.lat && { geo: { '@type': 'GeoCoordinates', latitude: biz.geo.lat, longitude: biz.geo.lng } }),
    openingHoursSpecification: biz.hours,
    image: absUrl(biz.og_image),
    priceRange: biz.price_range,
    areaServed,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${biz.name} Services`,
      itemListElement: categories.map((c) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: c.name, description: c.description },
      })),
    },
    ...(biz.review_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: String(biz.rating),
        reviewCount: String(biz.review_count),
        bestRating: '5',
        worstRating: '1',
      },
    }),
    review: reviews.slice(0, 3).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      reviewRating: { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5' },
      reviewBody: r.text,
      datePublished: r.date,
    })),
    sameAs: biz.same_as,
  };
}

export function service(name: string, description: string, path: string) {
  return { '@context': 'https://schema.org', '@type': 'Service', name, description, provider, areaServed, url: absUrl(path) };
}

export function faqPage(faq?: Faq | null) {
  if (!faq?.items?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.path === '/' ? `${biz.url}/` : absUrl(it.path),
    })),
  };
}

export { site };
