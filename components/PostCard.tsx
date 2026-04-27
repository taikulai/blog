import Link from 'next/link'
import { PostMeta } from '@/lib/posts'

interface PostCardProps {
  post: PostMeta
  featured?: boolean
}

export default function PostCard({ post, featured }: PostCardProps) {
  return (
    <article className={`glass-card p-6 transition-all duration-300 cursor-pointer ${featured ? 'md:col-span-2' : ''}`}>
      <Link href={`/posts/${post.slug}`} className="block">
        <div className="flex items-center gap-3 mb-3">
          <span className="neon-tag">
            {post.category}
          </span>
          <span className="text-dark-400 text-sm">{post.date}</span>
        </div>
        <h2 className={`font-bold text-gray-100 hover:text-neon-cyan transition-colors duration-300 mb-3 ${featured ? 'text-2xl' : 'text-xl'}`}>
          {post.title}
        </h2>
        <p className="text-dark-300 leading-relaxed line-clamp-2 mb-4">
          {post.excerpt}
        </p>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded bg-dark-700/50 text-neon-purple border border-dark-500/30"
            >
              #{tag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  )
}
