const express = require("express");

const router = express.Router();
const BASE_URL = "https://www.mondusproperties.ae";

router.get("/sitemap.xml", async (req, res) => {
  try {
    const blogRes = await fetch(`${process.env.API_BASE}/api/blogs/viewblog`);
    const blogJson = await blogRes.json();
    const blogs = blogJson.data || blogJson.blogs || [];

    const rentRes = await fetch(
      `${process.env.API_BASE}/api/property?listingType=rent&status=true`,
    );
    const rentJson = await rentRes.json();
    const rentProps = rentJson.data || [];

    const buyRes = await fetch(
      `${process.env.API_BASE}/api/property?listingType=buy&status=true`,
    );
    const buyJson = await buyRes.json();
    const buyProps = buyJson.data || [];

    const staticPages = [
      "",
      "/buy",
      "/rent",
      "/offplan",
      "/blogs",
      "/contact",
      "/about",
      "/developers",
    ];

    const generateUrl = (loc, lastmod, priority = "0.7") => `
      <url>
        <loc>${BASE_URL}${loc}</loc>
        <lastmod>${new Date(lastmod).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>${priority}</priority>
      </url>
    `;

    let urls = [];

    staticPages.forEach((page) => {
      urls.push(generateUrl(page, new Date()));
    });

    blogs.forEach((blog) => {
      if (!blog.slug) return;
      urls.push(
        generateUrl(
          `/blogs/${blog.slug}`,
          blog.lastUpdated || blog.datePublished,
          "0.8",
        ),
      );
    });

    rentProps.forEach((prop) => {
      if (!prop.slug) return;
      urls.push(
        generateUrl(
          `/rent/${prop.slug}`,
          prop.updatedAt || prop.createdAt,
          "0.9",
        ),
      );
    });

    buyProps.forEach((prop) => {
      if (!prop.slug) return;
      urls.push(
        generateUrl(
          `/buy/${prop.slug}`,
          prop.updatedAt || prop.createdAt,
          "0.9",
        ),
      );
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.join("")}
    </urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(sitemap);
  } catch (error) {
    console.error("Sitemap error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

module.exports = router;
