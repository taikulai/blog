import { NextApiRequest, NextApiResponse } from 'next'
import { getSortedPostsData, getCategories } from '@/lib/posts'
import { siteConfig as config } from '@/lib/config'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const posts = getSortedPostsData()
  const categories = getCategories()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://taikulai.github.io'
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 静态页面 -->
  <url>
    <loc>${siteUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/archive</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- 分类页面 -->
  ${categories.map((category) => `
  <url>
    <loc>${siteUrl}/category/${encodeURIComponent(category)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  `).join('\n  ')}
  
  <!-- 文章页面 -->
  ${posts.map((post) => `
  <url>
    <loc>${siteUrl}/posts/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  `).join('\n  ')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml')
  res.status(200).send(sitemap)
}