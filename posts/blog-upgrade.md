---
title: 博客大升级：从静态页面到功能完备的个人网站
date: 2026-06-15
category: 技术
tags: [Next.js, 博客, 前端, Tailwind CSS]
excerpt: 最近给博客做了一次全面升级，新增了文章目录、前后篇导航、搜索功能、RSS订阅、评论系统等功能，本文记录了改进过程和实现细节。
---

# 博客大升级

距离上次写文章已经一个多月了，博客也一直处于"能用但不够好用"的状态。趁着周末有时间，给博客做了一次全面升级。

## 升级内容一览

这次升级主要新增了以下功能：

| 功能 | 说明 |
|------|------|
| 文章目录(TOC) | 自动提取标题生成侧边目录，点击可跳转 |
| 前后篇导航 | 文章底部显示上一篇/下一篇链接 |
| 阅读时长统计 | 根据字数自动计算阅读时间 |
| 返回顶部按钮 | 长文章滚动后一键回顶 |
| 搜索功能 | 全站搜索，支持标题/分类/标签/内容 |
| RSS订阅 | 生成标准 RSS XML，方便订阅 |
| Sitemap | 自动生成站点地图，利于 SEO |
| 社交分享 | 一键分享到 Twitter/微博，支持复制链接 |
| 评论系统 | 集成 Giscus，基于 GitHub Discussions |
| 浏览量统计 | 可接入 LeanCloud 统计 PV |

## 实现细节

### 1. 文章目录(TOC)

TOC 组件的核心是从渲染后的 HTML 中提取标题：

```tsx
const headings = tempDiv.querySelectorAll('h1, h2, h3')
headings.forEach((heading, index) => {
  const level = parseInt(heading.tagName.charAt(1))
  const text = heading.textContent || ''
  let id = heading.id || `heading-${index}`
  tocItems.push({ id, text, level })
})
```

同时监听滚动事件，高亮当前阅读位置的标题。

### 2. 阅读时长计算

中文和英文的阅读速度不同，需要分别计算：

- 中文约 300 字/分钟
- 英文约 200 词/分钟

### 3. 搜索功能

搜索采用前端实现，所有文章数据通过 API 预加载，支持标题、分类、标签、内容全文搜索。

### 4. RSS 和 Sitemap

使用 Next.js API Route 动态生成 XML，方便 RSS 阅读器订阅和搜索引擎收录。

### 5. 评论系统

选用 Giscus，基于 GitHub Discussions，免费且无广告。需要在 GitHub 仓库启用 Discussions 功能。

## 遇到的问题

### Tailwind CSS 4 的变化

这次升级发现 Tailwind CSS 4 的配置方式变了，不再使用 `tailwind.config.js`，而是直接在 CSS 文件中用 `@theme` 定义主题变量。

### Next.js 静态导出的限制

使用 `next export` 时，API Route 不会生效。RSS/Sitemap 需要在构建时预生成静态文件。

## 后续计划

还有一些可以继续改进的地方：

- 暗色/亮色主题切换
- 文章封面图支持
- 代码块语法高亮优化
- 标签页面
- 相关文章推荐

---

这次升级让博客从"能用"变成了"好用"，写文章的动力也更强了。如果你也在搭建个人博客，希望这些经验对你有帮助。