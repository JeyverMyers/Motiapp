import type { MetadataRoute } from "next";

import { URL_SITIO } from "@/lib/constantes";

/** Solo se indexa lo público; el panel y la administración, nunca. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/api", "/login"] }],
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
