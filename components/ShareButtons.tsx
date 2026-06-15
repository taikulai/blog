'use client'

import { siteConfig } from '@/lib/config'

interface ShareButtonsProps {
  title: string
  slug: string
}

export default function ShareButtons({ title, slug }: ShareButtonsProps) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://taikulai.github.io'}/posts/${slug}`
  const encodedTitle = encodeURIComponent(title)
  const encodedUrl = encodeURIComponent(url)

  const shareLinks = [
    {
      name: 'Twitter',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: '微博',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.807 18.655c-3.91.39-7.288-1.37-7.546-3.934-.258-2.564 2.837-4.994 6.747-5.384 3.91-.39 7.288 1.37 7.546 3.934.258 2.564-2.837 4.994-6.747 5.384zm10.763-8.55c-.318-.106-.532-.17-.368-.612.358-.958.394-1.788.002-2.372-.733-1.095-2.739-1.025-5.054-.034 0 0-.722.32-.538-.26.355-1.15.304-2.116-.252-2.668-1.262-1.253-4.633.047-7.524 2.893-2.172 2.145-3.448 4.413-3.448 6.373 0 3.752 4.717 6.043 9.318 6.043 6.055 0 10.097-3.543 10.097-6.354 0-1.705-1.413-2.668-2.233-2.978z"/>
        </svg>
      ),
      href: `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: '复制链接',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: 'copy',
    },
  ]

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      alert('链接已复制到剪贴板！')
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('链接已复制到剪贴板！')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-dark-400 text-sm">分享：</span>
      {shareLinks.map((link) => (
        link.action === 'copy' ? (
          <button
            key={link.name}
            onClick={handleCopy}
            className="w-8 h-8 rounded-full bg-dark-700/50 border border-dark-500/30 text-dark-300 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all duration-300 flex items-center justify-center"
            title={link.name}
          >
            {link.icon}
          </button>
        ) : (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-dark-700/50 border border-dark-500/30 text-dark-300 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all duration-300 flex items-center justify-center"
            title={link.name}
          >
            {link.icon}
          </a>
        )
      ))}
    </div>
  )
}