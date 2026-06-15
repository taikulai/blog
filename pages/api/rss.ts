import { NextApiRequest, NextApiResponse } from 'next'
import { getSortedPostsData } from '@/lib/posts'
import { siteConfig as config } from '@/lib/config'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const posts = getSortedPostsData()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://taikulai.github.io'
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${config.title}</title>
    <link>${siteUrl}</link>
    <description>${config.description}</description>
    <language>zh-CN</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts.map((post) => `
    <item>
      <title>${post.title}</title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <description>${post.excerpt}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid>${siteUrl}/posts/${post.slug}</guid>
      <category>${post.category}</category>
      ${post.tags.map((tag) => `<category>${tag}</category>`).join('\n      ')}
    </item>
    `).join('\n    ')}
  </channel>
</rss>`

  res.setHeader('Content-Type', 'application/xml')
  res.status(200).send(rss)
}