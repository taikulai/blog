import { GetStaticProps } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'
import { getSortedPostsData, PostMeta } from '@/lib/posts'
import { siteConfig } from '@/lib/config'
import { useState, useEffect } from 'react'

interface HomeProps {
  posts: PostMeta[]
  categories: string[]
}

function HeroSection() {
  return (
    <section className="relative mb-16 py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-neon-purple/20 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-neon-pink/10 rounded-full blur-[80px] animate-float" style={{ animationDelay: '-1.5s' }} />
      </div>

      <div className="relative text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-purple/30 bg-neon-purple/10 text-neon-cyan text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          Welcome to my blog
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          <span className="glow-text">{siteConfig.title}</span>
        </h1>
        <p className="text-lg md:text-xl text-dark-300 mb-8 leading-relaxed max-w-2xl mx-auto">
          {siteConfig.description}
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="#posts" className="gradient-btn">
            开始阅读
          </a>
          <a
            href="#about"
            className="px-6 py-2.5 rounded-lg font-medium text-gray-300 border border-dark-500/50 hover:border-neon-purple/50 hover:text-neon-cyan transition-all duration-300"
          >
            了解更多
          </a>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />
    </section>
  )
}

interface Particle {
  id: number
  size: number
  x: number
  y: number
  duration: number
  delay: number
  opacity: number
}

function ParticleField() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    const seed = 42
    const random = (i: number) => {
      const x = Math.sin(seed + i) * 10000
      return x - Math.floor(x)
    }
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      size: random(i * 1.1) * 3 + 1,
      x: random(i * 2.2) * 100,
      y: random(i * 3.3) * 100,
      duration: random(i * 4.4) * 20 + 10,
      delay: random(i * 5.5) * 5,
      opacity: random(i * 6.6) * 0.5 + 0.1,
    }))
    setParticles(newParticles)
  }, [])

  if (particles.length === 0) return null

  return (
    <div className="fixed inset-0 -z-20 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-neon-cyan"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function Home({ posts, categories }: HomeProps) {
  return (
    <Layout>
      <ParticleField />
      <HeroSection />

      <div id="posts" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-gradient-to-b from-neon-blue to-neon-purple rounded-full" />
            <h2 className="text-2xl font-bold text-gray-100">最新文章</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-neon-purple/30 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.slice(0, 1).map((post) => (
              <PostCard key={post.slug} post={post} featured />
            ))}
            {posts.slice(1).map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
          {posts.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">🌌</div>
              <p className="text-dark-300 text-lg">暂无文章，敬请期待！</p>
            </div>
          )}
        </div>

        <aside id="about" className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-24 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-xl">
                  {siteConfig.author[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-100">{siteConfig.author}</h3>
                  <p className="text-dark-400 text-xs">博主</p>
                </div>
              </div>
              <p className="text-dark-300 text-sm leading-relaxed">
                {siteConfig.description}
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />

            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
                分类
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/category/${encodeURIComponent(category)}`}
                    className="neon-tag transition-all duration-300"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />

            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
                统计
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-dark-700/30 border border-dark-500/20">
                  <div className="text-xl font-bold glow-text">{posts.length}</div>
                  <div className="text-dark-400 text-xs">文章</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-dark-700/30 border border-dark-500/20">
                  <div className="text-xl font-bold glow-text">{categories.length}</div>
                  <div className="text-dark-400 text-xs">分类</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
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
