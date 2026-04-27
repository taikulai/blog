import { GetStaticPaths, GetStaticProps } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { getAllPostSlugs, getPostData, Post } from '@/lib/posts'

interface PostProps {
  post: Post
}

export default function PostPage({ post }: PostProps) {
  return (
    <Layout title={post.title} description={post.excerpt}>
      <article className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-dark-300 hover:text-neon-cyan transition-colors duration-300 mb-8 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="neon-tag">
              {post.category}
            </span>
            <span className="text-dark-400 text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {post.date}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-100 mb-6 leading-tight">
            {post.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs rounded bg-dark-700/50 text-neon-purple border border-dark-500/30"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-neon-purple/50 via-neon-blue/30 to-transparent" />
        </header>

        <div
          className="prose prose-lg prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </Layout>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllPostSlugs()
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<PostProps> = async ({ params }) => {
  const slug = params?.slug as string
  const post = await getPostData(slug)
  return {
    props: {
      post,
    },
  }
}
