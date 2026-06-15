import Link from 'next/link'
import { PostMeta } from '@/lib/posts'

interface PostNavigationProps {
  prevPost?: PostMeta | null
  nextPost?: PostMeta | null
}

export default function PostNavigation({ prevPost, nextPost }: PostNavigationProps) {
  if (!prevPost && !nextPost) return null

  return (
    <nav className="mt-12 pt-8 border-t border-dark-600/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prevPost && (
          <Link
            href={`/posts/${prevPost.slug}`}
            className="glass-card p-4 group hover:border-neon-purple/40 transition-all duration-300"
          >
            <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一篇
            </div>
            <h3 className="font-medium text-gray-100 group-hover:text-neon-cyan transition-colors truncate">
              {prevPost.title}
            </h3>
            <span className="text-dark-500 text-xs mt-1">{prevPost.date}</span>
          </Link>
        )}
        
        {nextPost && (
          <Link
            href={`/posts/${nextPost.slug}`}
            className="glass-card p-4 group hover:border-neon-cyan/40 transition-all duration-300 text-right"
          >
            <div className="flex items-center justify-end gap-2 text-dark-400 text-sm mb-2">
              下一篇
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-100 group-hover:text-neon-cyan transition-colors truncate">
              {nextPost.title}
            </h3>
            <span className="text-dark-500 text-xs mt-1">{nextPost.date}</span>
          </Link>
        )}
        
        {!prevPost && (
          <div className="glass-card p-4 opacity-50">
            <div className="text-dark-400 text-sm">没有更多文章了</div>
          </div>
        )}
        
        {!nextPost && (
          <div className="glass-card p-4 opacity-50 text-right">
            <div className="text-dark-400 text-sm">没有更多文章了</div>
          </div>
        )}
      </div>
    </nav>
  )
}