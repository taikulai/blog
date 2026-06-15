'use client'

import { useEffect, useState } from 'react'

interface ViewCounterProps {
  slug: string
}

// LeanCloud 配置 - 需要在环境变量中设置
const LEANCLOUD_APP_ID = process.env.NEXT_PUBLIC_LEANCLOUD_APP_ID || ''
const LEANCLOUD_APP_KEY = process.env.NEXT_PUBLIC_LEANCLOUD_APP_KEY || ''
const LEANCLOUD_SERVER_URL = process.env.NEXT_PUBLIC_LEANCLOUD_SERVER_URL || 'https://leancloud.us'

export default function ViewCounter({ slug }: ViewCounterProps) {
  const [views, setViews] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!LEANCLOUD_APP_ID || !LEANCLOUD_APP_KEY) {
      // 如果没有配置 LeanCloud，显示提示
      setLoading(false)
      return
    }

    const fetchAndIncrementViews = async () => {
      try {
        // 先获取当前浏览量
        const getUrl = `${LEANCLOUD_SERVER_URL}/1.1/classes/PostViews?where={"slug":"${slug}"}`
        const getResponse = await fetch(getUrl, {
          headers: {
            'X-LC-Id': LEANCLOUD_APP_ID,
            'X-LC-Key': LEANCLOUD_APP_KEY,
            'Content-Type': 'application/json',
          },
        })
        const getData = await getResponse.json()

        if (getData.results && getData.results.length > 0) {
          // 已有记录，更新浏览量
          const existingRecord = getData.results[0]
          const newViews = existingRecord.views + 1
          
          const updateUrl = `${LEANCLOUD_SERVER_URL}/1.1/classes/PostViews/${existingRecord.objectId}`
          await fetch(updateUrl, {
            method: 'PUT',
            headers: {
              'X-LC-Id': LEANCLOUD_APP_ID,
              'X-LC-Key': LEANCLOUD_APP_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ views: newViews }),
          })
          
          setViews(newViews)
        } else {
          // 无记录，创建新记录
          const createUrl = `${LEANCLOUD_SERVER_URL}/1.1/classes/PostViews`
          await fetch(createUrl, {
            method: 'POST',
            headers: {
              'X-LC-Id': LEANCLOUD_APP_ID,
              'X-LC-Key': LEANCLOUD_APP_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ slug, views: 1 }),
          })
          
          setViews(1)
        }
      } catch (error) {
        console.error('Failed to fetch views:', error)
        setViews(0)
      } finally {
        setLoading(false)
      }
    }

    fetchAndIncrementViews()
  }, [slug])

  if (!LEANCLOUD_APP_ID || !LEANCLOUD_APP_KEY) {
    return (
      <span className="text-dark-400 text-xs flex items-center gap-1.5" title="浏览量统计未配置">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-dark-500">统计未启用</span>
      </span>
    )
  }

  return (
    <span className="text-dark-400 text-sm flex items-center gap-1.5">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      {loading ? '...' : views} 次阅读
    </span>
  )
}