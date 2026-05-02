import Layout from '@/components/Layout'
import { siteConfig } from '@/lib/config'

export default function About() {
  return (
    <Layout title="关于" description="关于我">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1 h-10 bg-gradient-to-b from-neon-blue to-neon-purple rounded-full" />
          <h1 className="text-3xl font-bold text-gray-100">关于</h1>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-3xl shrink-0">
              {siteConfig.author[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold glow-text mb-2">{siteConfig.author}</h2>
              <p className="text-dark-300 leading-relaxed">{siteConfig.description}</p>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />

          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
              关于这个博客
            </h3>
            <p className="text-dark-300 leading-relaxed mb-4">
              这是一个使用 Next.js + Tailwind CSS 搭建的个人博客，采用赛博科技风格设计。
            </p>
            <p className="text-dark-300 leading-relaxed mb-4">
              主要用于记录技术笔记、生活感悟和项目经验分享。
            </p>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-4 rounded-lg bg-dark-700/30 border border-dark-500/20">
                <div className="text-xl font-bold glow-text">Next.js</div>
                <div className="text-dark-400 text-xs mt-1">框架</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-dark-700/30 border border-dark-500/20">
                <div className="text-xl font-bold glow-text">Tailwind CSS</div>
                <div className="text-dark-400 text-xs mt-1">样式</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-dark-700/30 border border-dark-500/20">
                <div className="text-xl font-bold glow-text">Markdown</div>
                <div className="text-dark-400 text-xs mt-1">写作</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-dark-700/30 border border-dark-500/20">
                <div className="text-xl font-bold glow-text">GitHub Pages</div>
                <div className="text-dark-400 text-xs mt-1">部署</div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />

          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
              联系方式
            </h3>
            <div className="space-y-3">
              <a href="https://github.com/taikulai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-dark-300 hover:text-neon-cyan transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub: taikulai
              </a>
              <span className="flex items-center gap-3 text-dark-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Email: 1476998537@qq.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
