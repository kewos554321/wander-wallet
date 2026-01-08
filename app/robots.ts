import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/projects/", "/settings/"],
    },
    sitemap: "https://wander-wallet-app.vercel.app/sitemap.xml",
  }
}
