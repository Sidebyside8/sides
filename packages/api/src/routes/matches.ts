import { FastifyInstance } from 'fastify'
import { supabase } from '../supabase'

export async function matchRoutes(server: FastifyInstance) {
  server.post('/likes/:id', async (request: any, reply) => {
    try {
      const user = await request.jwtVerify()
      const likerId = user.sub
      const likedId = request.params.id
      const { error: likeError } = await supabase
        .from('likes')
        .insert({ liker_id: likerId, liked_id: likedId })
      if (likeError) return reply.status(400).send({ error: likeError.message })
      const { data: mutualLike } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', likedId)
        .eq('liked_id', likerId)
        .single()
      if (mutualLike) {
        const user1 = likerId < likedId ? likerId : likedId
        const user2 = likerId < likedId ? likedId : likerId
        await supabase.from('matches').insert({ user1_id: user1, user2_id: user2 })
        return { matched: true }
      }
      return { matched: false }
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  server.get('/matches', async (request: any, reply) => {
    try {
      const user = await request.jwtVerify()
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.sub},user2_id.eq.${user.sub}`)
      if (error) return reply.status(400).send({ error: error.message })
      return data
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}
