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
  wordCount: number
  readingTime: string
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

// 计算阅读时长
function calculateReadingTime(content: string): { wordCount: number; readingTime: string } {
  // 移除 Markdown 标记，只保留文本
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]*`/g, '') // 移除行内代码
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 保留链接文本
    .replace(/[#*_~>-]/g, '') // 移除 Markdown 符号
    .replace(/\n+/g, ' ') // 换行转为空格
    .trim()

  // 中文按字符数，英文按单词数
  const chineseChars = (plainText.match(/[^\x00-\xff]/g) || []).length
  const englishWords = plainText.replace(/[^\x00-\xff]/g, '').split(/\s+/).filter(w => w).length
  
  // 中文约 300 字/分钟，英文约 200 词/分钟
  const readingMinutes = Math.ceil(chineseChars / 300 + englishWords / 200)
  const wordCount = chineseChars + englishWords

  return {
    wordCount,
    readingTime: readingMinutes < 1 ? '不到1分钟' : `约 ${readingMinutes} 分钟`
  }
}

export async function getPostData(slug: string): Promise<Post> {
  const fullPath = path.join(postsDirectory, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const processedContent = await remark().use(html).process(content)
  const contentHtml = processedContent.toString()
  
  const { wordCount, readingTime } = calculateReadingTime(content)

  return {
    slug,
    title: data.title || '',
    date: data.date ? format(new Date(data.date), 'yyyy-MM-dd') : '',
    category: data.category || '未分类',
    tags: data.tags || [],
    excerpt: data.excerpt || '',
    content: contentHtml,
    wordCount,
    readingTime,
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

// 获取前后篇文章
export function getAdjacentPosts(currentSlug: string): { prev: PostMeta | null; next: PostMeta | null } {
  const posts = getSortedPostsData()
  const currentIndex = posts.findIndex((post) => post.slug === currentSlug)
  
  if (currentIndex === -1) {
    return { prev: null, next: null }
  }
  
  // 上一篇是时间更晚的（数组中索引更小的）
  const prev = currentIndex > 0 ? posts[currentIndex - 1] : null
  // 下一篇是时间更早的（数组中索引更大的）
  const next = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  
  return { prev, next }
}

// 获取所有文章用于搜索
export function getAllPostsForSearch(): Array<{
  slug: string
  title: string
  date: string
  category: string
  tags: string[]
  excerpt: string
  content: string
}> {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  return fileNames
    .filter((name) => name.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content, excerpt } = matter(fileContents, { excerpt: true })

      return {
        slug,
        title: data.title || '',
        date: data.date ? format(new Date(data.date), 'yyyy-MM-dd') : '',
        category: data.category || '未分类',
        tags: data.tags || [],
        excerpt: excerpt || '',
        content: content.slice(0, 500), // 只取前500字符用于搜索
      }
    })
}