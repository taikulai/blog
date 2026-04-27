import { format } from 'date-fns'
import { remark } from 'remark'
import html from 'remark-html'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'posts')

export interface PostMeta {
  slug: string
  title: string
  date: string
  category: string
  tags: string[]
  excerpt: string
}

export interface Post extends PostMeta {
  content: string
}

export function getSortedPostsData(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  const allPostsData = fileNames
    .filter((name) => name.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, excerpt } = matter(fileContents, { excerpt: true })

      return {
        slug,
        title: data.title || '',
        date: data.date ? format(new Date(data.date), 'yyyy-MM-dd') : '',
        category: data.category || '未分类',
        tags: data.tags || [],
        excerpt: excerpt || '',
      }
    })

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }
  return fs
    .readdirSync(postsDirectory)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''))
}

export async function getPostData(slug: string): Promise<Post> {
  const fullPath = path.join(postsDirectory, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const processedContent = await remark().use(html).process(content)
  const contentHtml = processedContent.toString()

  return {
    slug,
    title: data.title || '',
    date: data.date ? format(new Date(data.date), 'yyyy-MM-dd') : '',
    category: data.category || '未分类',
    tags: data.tags || [],
    excerpt: data.excerpt || '',
    content: contentHtml,
  }
}

export function getCategories(): string[] {
  const posts = getSortedPostsData()
  const categories = new Set(posts.map((post) => post.category))
  return Array.from(categories)
}

export function getTags(): string[] {
  const posts = getSortedPostsData()
  const tags = new Set(posts.flatMap((post) => post.tags))
  return Array.from(tags)
}

export function getPostsByCategory(category: string): PostMeta[] {
  return getSortedPostsData().filter((post) => post.category === category)
}

export function getPostsByTag(tag: string): PostMeta[] {
  return getSortedPostsData().filter((post) => post.tags.includes(tag))
}
