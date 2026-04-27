---
title: Tailwind CSS 实战技巧
date: 2026-04-26
category: 技术
tags: [Tailwind, CSS, 前端]
excerpt: 分享一些实用的 Tailwind CSS 技巧，帮助你更高效地构建界面。
---

# Tailwind CSS 实战技巧

Tailwind CSS 是一个功能优先的 CSS 框架，本文分享一些实用技巧。

## 1. 响应式设计

使用简单的前缀来实现响应式设计：

```html
<div class="text-base md:text-lg lg:text-xl">
  响应式文本
</div>
```

## 2. 自定义主题

在 `tailwind.config.js` 中自定义主题：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
      }
    }
  }
}
```

## 3. 组件化

使用 `@apply` 创建可复用的组件样式。

希望这些技巧对你有帮助！
