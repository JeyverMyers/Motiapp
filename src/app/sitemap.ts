import type { MetadataRoute } from "next";

import { URL_SITIO } from "@/lib/constantes";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_SITIO}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${URL_SITIO}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${URL_SITIO}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
