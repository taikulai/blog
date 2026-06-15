'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface SearchResult {
  slug: string
  title: string
  date: string
  category: string
  tags: string[]
  excerpt: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [allPosts, setAllPosts] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // 加载所有文章数据
  useEffect(() => {
    fetch('/api/search')
      .then((res) => res.json())
      .then((data) => setAllPosts(data))
      .catch(() => setAllPosts([]))
  }, [])

  // 搜索逻辑
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = allPosts.filter((post) => {
      return (
        post.title.toLowerCase().includes(lowerQuery) ||
        post.category.toLowerCase().includes(lowerQuery) ||
        post.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        post.excerpt.toLowerCase().includes(lowerQuery)
      )
    })
    setResults(filtered)
  }, [query, allPosts])

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 搜索框 */}
      <div className="relative w-full max-w-2xl glass-card p-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-5 h-5 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文章标题、分类、标签..."
            className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-dark-400"
          />
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 搜索结果 */}
        {query.trim() && (
          <div className="max-h-[60vh] overflow-y-auto">
            {results.length > 0 ? (
              <ul className="space-y-2">
                {results.map((result) => (
                  <li key={result.slug}>
                    <Link
                      href={`/posts/${result.slug}`}
                      onClick={onClose}
                      className="block p-3 rounded-lg bg-dark-700/30 hover:bg-dark-700/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="neon-tag !text-[10px] !px-2">{result.category}</span>
                        <span className="text-dark-400 text-xs">{result.date}</span>
                      </div>
                      <h3 className="font-medium text-gray-100 group-hover:text-neon-cyan transition-colors">
                        {result.title}
                      </h3>
                      <p className="text-dark-300 text-sm mt-1 line-clamp-2">
                        {result.excerpt}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-dark-300">未找到相关文章</p>
              </div>
            )}
          </div>
        )}

        {/* 快捷键提示 */}
        <div className="mt-4 pt-3 border-t border-dark-600/30 text-dark-400 text-xs flex items-center gap-4">
          <span>按 <kbd className="px-1.5 py-0.5 rounded bg-dark-700/50">ESC</kbd> 关闭</span>
          <span>共 {allPosts.length} 篇文章</span>
        </div>
      </div>
    </div>
  )
}