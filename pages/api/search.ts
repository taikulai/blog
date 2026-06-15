import { NextApiRequest, NextApiResponse } from 'next'
import { getAllPostsForSearch } from '@/lib/posts'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const posts = getAllPostsForSearch()
  res.status(200).json(posts)
}