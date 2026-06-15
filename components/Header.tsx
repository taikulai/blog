import Link from 'next/link'
import { siteConfig } from '@/lib/config'
import { useState } from 'react'
import SearchModal from './SearchModal'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50">
        <div className="absolute inset-0 bg-dark-900/70 backdrop-blur-xl border-b border-neon-purple/20" />
        <div className="container-blog py-4 relative">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-lg animate-pulse-glow">
                B
              </div>
              <span className="text-2xl font-bold glow-text group-hover:opacity-80 transition-opacity">
                {siteConfig.title}
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {siteConfig.navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-4 py-2 text-gray-300 hover:text-neon-cyan transition-colors duration-300 group"
                >
                  <span className="relative z-10">{item.label}</span>
                  <span className="absolute inset-0 rounded-lg bg-neon-purple/0 group-hover:bg-neon-purple/10 transition-colors duration-300" />
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-purple group-hover:w-3/4 transition-all duration-300" />
                </Link>
              ))}
              
              {/* 搜索按钮 */}
              <button
                onClick={() => setSearchOpen(true)}
                className="relative px-4 py-2 text-gray-300 hover:text-neon-cyan transition-colors duration-300 group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="absolute inset-0 rounded-lg bg-neon-purple/0 group-hover:bg-neon-purple/10 transition-colors duration-300" />
              </button>
            </nav>

            <div className="flex items-center gap-2 md:hidden">
              {/* 移动端搜索按钮 */}
              <button
                onClick={() => setSearchOpen(true)}
                className="text-gray-300 hover:text-neon-cyan transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <button
                className="text-gray-300 hover:text-neon-cyan transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="md:hidden mt-4 pb-2 flex flex-col gap-1 border-t border-neon-purple/20 pt-4">
              {siteConfig.navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-gray-300 hover:text-neon-cyan hover:bg-neon-purple/10 rounded-lg transition-colors duration-300"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}