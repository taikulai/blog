import { GetStaticProps } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'
import { getSortedPostsData, PostMeta } from '@/lib/posts'
import { siteConfig } from '@/lib/config'
import { useState, useCallback, useEffect, useRef } from 'react'

const FluidBackground = dynamic(() => import('@/components/FluidBackground'), { ssr: false })
const GridBackground = dynamic(() => import('@/components/GridBackground'), { ssr: false })
const IntroSection = dynamic(() => import('@/components/IntroSection'), { ssr: false })

interface HomeProps {
  posts: PostMeta[]
  categories: string[]
}

export default function Home({ posts, categories }: HomeProps) {
  const [entered, setEntered] = useState(false)
  const [introOut, setIntroOut] = useState(false)
  const [mainVisible, setMainVisible] = useState(false)
  const introRef = useRef<HTMLDivElement>(null)
  const shapePathRef = useRef<SVGPathElement>(null)

  const handleEnter = useCallback(() => {
    if (entered) return
    setEntered(true)

    // Animate intro section sliding up
    if (introRef.current) {
      introRef.current.style.transition = 'transform 1.1s cubic-bezier(0.4, 0, 0.2, 1)'
      introRef.current.style.transform = 'translateY(-200vh)'
    }

    // Animate SVG shape morphing
    if (shapePathRef.current) {
      const targetD = "M -44,-50 C -137.1,117.4 67.86,445.5 236,452 435.3,459.7 500.5,242.6 676,244 873.5,245.6 957,522.4 1154,594 1593,753.7 1793,226.3 1582,-126 1371,-478.3 219.8,-524.2 -44,-50 Z"
      shapePathRef.current.style.transition = 'd 1.1s cubic-bezier(0.4, 0, 0.2, 1)'
      shapePathRef.current.setAttribute('d', targetD)
    }

    // SVG shape scale animation
    const shapeEl = introRef.current?.querySelector('.shape') as SVGElement | null
    if (shapeEl) {
      shapeEl.style.transformOrigin = '50% 0%'
      shapeEl.animate([
        { transform: 'scaleY(0.8)' },
        { transform: 'scaleY(1.8)', offset: 0.5 },
        { transform: 'scaleY(1)' }
      ], {
        duration: 1100,
        easing: 'ease-in-out',
        fill: 'forwards'
      })
    }

    setTimeout(() => setIntroOut(true), 1200)
    setTimeout(() => setMainVisible(true), 400)
  }, [entered])

  // Auto-enter after a timeout if user doesn't interact
  useEffect(() => {
    if (entered) return
    const timer = setTimeout(() => {
      // Don't auto-enter, let user decide
    }, 10000)
    return () => clearTimeout(timer)
  }, [entered])

  return (
    <Layout hideHeader={!entered} hideFooter={!entered}>
      {/* Intro Screen */}
      {!introOut && (
        <div ref={introRef} className="content-intro-wrapper">
          <FluidBackground active={!entered} />
          <IntroSection
            title={siteConfig.title}
            subtitle={siteConfig.description}
            onEnter={handleEnter}
          />
          {/* Hidden SVG path ref for morphing */}
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <path
              ref={shapePathRef}
              d="M -44,-50 C -52.71,28.52 15.86,8.186 184,14.69 383.3,22.39 462.5,12.58 638,14 835.5,15.6 987,6.4 1194,13.86 1661,30.68 1652,-36.74 1582,-140.1 1512,-243.5 15.88,-589.5 -44,-50 Z"
            />
          </svg>
        </div>
      )}

      {/* Main Content */}
      <div className={`content-main-wrapper ${mainVisible ? 'visible' : ''}`}>
        <GridBackground active={mainVisible} />

        {/* Hero Card Section */}
        <section className="relative z-10 min-h-screen flex items-center justify-center">
          <div className={`hero-card ${mainVisible ? 'in' : ''}`}>
            <header className="hero-card-header">
              <div className="avatar-circle">
                {siteConfig.author[0]}
              </div>
              <h1 className="hero-name">{siteConfig.author}</h1>
              <h2 className="hero-signature">{siteConfig.description}</h2>
            </header>
            <nav className="hero-nav">
              {siteConfig.navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hero-nav-item">
                  <span>{item.label}</span>
                </Link>
              ))}
              <a
                href="https://github.com/taikulai"
                target="_blank"
                rel="noopener noreferrer"
                className="hero-nav-item"
              >
                <span>GitHub</span>
              </a>
            </nav>
          </div>
        </section>

        {/* Blog Posts Section */}
        <section id="posts" className="relative z-10 py-16">
          <div className="container-blog">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 bg-gradient-to-b from-white/80 to-white/20 rounded-full" />
              <h2 className="text-2xl font-bold text-white">最新文章</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.slice(0, 1).map((post) => (
                <PostCard key={post.slug} post={post} featured />
              ))}
              {posts.slice(1).map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
            {posts.length === 0 && (
              <div className="glass-card p-12 text-center">
                <p className="text-gray-400 text-lg">暂无文章，敬请期待！</p>
              </div>
            )}
          </div>
        </section>

        {/* Categories & About Section */}
        <section id="about" className="relative z-10 py-16">
          <div className="container-blog">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  分类
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Link
                      key={category}
                      href={`/category/${encodeURIComponent(category)}`}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  统计
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-white">{posts.length}</div>
                    <div className="text-gray-400 text-xs">文章</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-white">{categories.length}</div>
                    <div className="text-gray-400 text-xs">分类</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const posts = getSortedPostsData()
  const categories = Array.from(
    new Set(posts.map((post) => post.category))
  )

  return {
    props: {
      posts,
      categories,
    },
  }
}
