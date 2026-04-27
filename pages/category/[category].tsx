import { GetStaticPaths, GetStaticProps } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'
import { getCategories, getPostsByCategory, PostMeta } from '@/lib/posts'

interface CategoryProps {
  category: string
  posts: PostMeta[]
}

export default function CategoryPage({ category, posts }: CategoryProps) {
  return (
    <Layout title={`分类: ${category}`}>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-dark-300 hover:text-neon-cyan transition-colors duration-300 mb-8 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1 h-10 bg-gradient-to-b from-neon-blue to-neon-purple rounded-full" />
          <h1 className="text-3xl font-bold text-gray-100">
            分类: <span className="glow-text">{category}</span>
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
        {posts.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">🌌</div>
            <p className="text-dark-300 text-lg">该分类下暂无文章。</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const categories = getCategories()
  return {
    paths: categories.map((category) => ({
      params: { category: encodeURIComponent(category) },
    })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<CategoryProps> = async ({
  params,
}) => {
  const category = decodeURIComponent(params?.category as string)
  const posts = getPostsByCategory(category)
  return {
    props: {
      category,
      posts,
    },
  }
}
