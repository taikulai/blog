import { GetStaticProps } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'
import { getSortedPostsData, getCategories, PostMeta } from '@/lib/posts'

interface ArchiveProps {
  posts: PostMeta[]
  categories: string[]
}

function groupPostsByYear(posts: PostMeta[]): Record<string, PostMeta[]> {
  const grouped: Record<string, PostMeta[]> = {}
  posts.forEach((post) => {
    const year = post.date.substring(0, 4)
    if (!grouped[year]) {
      grouped[year] = []
    }
    grouped[year].push(post)
  })
  return Object.keys(grouped).sort((a, b) => Number(b) - Number(a)).reduce(
    (obj, key) => {
      obj[key] = grouped[key]
      return obj
    },
    {} as Record<string, PostMeta[]>
  )
}

export default function Archive({ posts, categories }: ArchiveProps) {
  const groupedByYear = groupPostsByYear(posts)

  return (
    <Layout title="归档" description="文章归档">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1 h-10 bg-gradient-to-b from-neon-blue to-neon-purple rounded-full" />
          <h1 className="text-3xl font-bold text-gray-100">归档</h1>
          <span className="text-dark-400 text-sm ml-auto">共 {posts.length} 篇文章</span>
        </div>

        <div className="glass-card p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
            分类浏览
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/category/${encodeURIComponent(category)}`}
                className="neon-tag"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedByYear).map(([year, yearPosts]) => (
            <section key={year}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold glow-text">{year}</h2>
                <span className="text-dark-400 text-sm">{yearPosts.length} 篇</span>
                <div className="flex-1 h-px bg-gradient-to-r from-neon-purple/30 to-transparent" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {yearPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    className="group glass-card !p-4 flex items-center gap-4 hover:border-neon-cyan/40"
                  >
                    <div className="text-dark-400 text-sm whitespace-nowrap min-w-[70px]">
                      {post.date.substring(5)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-100 group-hover:text-neon-cyan transition-colors truncate">
                        {post.title}
                      </h3>
                      <span className="neon-tag !text-[10px] !px-2 !py-0 inline-block mt-1">
                        {post.category}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {posts.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">🌌</div>
              <p className="text-dark-300 text-lg">暂无文章，敬请期待！</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps<ArchiveProps> = async () => {
  const posts = getSortedPostsData()
  const categories = Array.from(new Set(posts.map((post) => post.category)))

  return {
    props: {
      posts,
      categories,
    },
  }
}
