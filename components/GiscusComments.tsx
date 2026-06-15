'use client'

import { useEffect, useRef } from 'react'

interface GiscusCommentsProps {
  slug: string
}

export default function GiscusComments({ slug }: GiscusCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 清空容器
    containerRef.current.innerHTML = ''

    // 创建 script 元素
    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.setAttribute('data-repo', 'taikulai/blog')
    script.setAttribute('data-repo-id', '') // 需要在 GitHub 上获取
    script.setAttribute('data-category', 'Announcements')
    script.setAttribute('data-category-id', '') // 需要在 GitHub 上获取
    script.setAttribute('data-mapping', 'pathname')
    script.setAttribute('data-strict', '0')
    script.setAttribute('data-reactions-enabled', '1')
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', 'top')
    script.setAttribute('data-theme', 'https://giscus.app/themes/custom.css')
    script.setAttribute('data-lang', 'zh-CN')
    script.setAttribute('crossorigin', 'anonymous')
    script.async = true

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [slug])

  return (
    <div className="mt-12 pt-8 border-t border-dark-600/50">
      <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
        评论
      </h3>
      <div 
        ref={containerRef}
        className="giscus-container"
      />
      <p className="text-dark-400 text-sm mt-4">
        评论功能需要先在 GitHub Discussions 中配置。请前往 
        <a 
          href="https://giscus.app/zh-CN" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-neon-cyan hover:underline"
        >
          giscus.app
        </a> 
        获取你的 repo-id 和 category-id。
      </p>
    </div>
  )
}