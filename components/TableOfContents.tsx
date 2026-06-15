'use client'

import { useEffect, useState } from 'react'

interface TOCItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  content: string
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [items, setItems] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // 从 HTML 内容中提取标题
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const headings = tempDiv.querySelectorAll('h1, h2, h3')
    
    const tocItems: TOCItem[] = []
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1))
      const text = heading.textContent || ''
      // 如果没有 id，生成一个
      let id = heading.id
      if (!id) {
        id = `heading-${index}`
        heading.id = id
      }
      tocItems.push({ id, text, level })
    })
    
    setItems(tocItems)
    
    // 监听滚动，更新当前活跃标题
    const handleScroll = () => {
      const headingElements = document.querySelectorAll('h1, h2, h3')
      let currentId = ''
      
      headingElements.forEach((heading) => {
        const rect = heading.getBoundingClientRect()
        if (rect.top <= 100 && rect.bottom >= 0) {
          currentId = heading.id
        }
      })
      
      setActiveId(currentId)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [content])

  if (items.length === 0) return null

  return (
    <nav className="glass-card p-4 sticky top-24">
      <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
        目录
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
          >
            <a
              href={`#${item.id}`}
              className={`block py-1 transition-colors duration-200 ${
                activeId === item.id
                  ? 'text-neon-cyan font-medium'
                  : 'text-dark-400 hover:text-gray-200'
              }`}
              onClick={(e) => {
                e.preventDefault()
                const element = document.getElementById(item.id)
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}