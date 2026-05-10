import { FastifyInstance } from 'fastify'
import { supabase } from '../supabase'

export async function messageRoutes(server: FastifyInstance) {
  server.get('/matches/:matchId/messages', async (request: any, reply) => {
    try {
      const user = await request.jwtVerify()
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', request.params.matchId)
        .or(`user1_id.eq.${user.sub},user2_id.eq.${user.sub}`)
        .single()
      if (!match) return reply.status(403).send({ error: 'Not part of this match' })
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', request.params.matchId)
        .order('created_at', { ascending: true })
      if (error) return reply.status(400).send({ error: error.message })
      return data
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  server.post('/matches/:matchId/messages', async (request: any, reply) => {
    try {
      const user = await request.jwtVerify()
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', request.params.matchId)
        .or(`user1_id.eq.${user.sub},user2_id.eq.${user.sub}`)
        .single()
      if (!match) return reply.status(403).send({ error: 'Not part of this match' })
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: request.params.matchId,
          sender_id: user.sub,
          content: (request.body as any).content,
        })
        .select()
        .single()
      if (error) return reply.status(400).send({ error: error.message })
      return reply.status(201).send(data)
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}
