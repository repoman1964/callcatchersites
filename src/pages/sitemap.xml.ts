import type { APIRoute } from "astro";

const routes = [
  "/", "/services",
  "/services/recurring-cleaning", "/services/deep-cleaning",
  "/services/move-in-move-out-cleaning", "/services/airbnb-cleaning",
  "/services/post-construction-cleaning", "/services/office-cleaning",
  "/service-areas", "/service-areas/buckhead", "/service-areas/midtown",
  "/service-areas/sandy-springs", "/service-areas/decatur",
  "/service-areas/brookhaven", "/service-areas/old-fourth-ward",
  "/about", "/pricing", "/reviews", "/book", "/guarantee",
  "/faq", "/contact", "/privacy", "/terms",
];

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() ?? "https://[businessdomain].com").replace(/\/$/, "");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((r) => `  <url><loc>${base}${r}</loc><changefreq>weekly</changefreq></url>`).join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
