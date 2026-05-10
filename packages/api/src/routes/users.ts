import { FastifyInstance } from 'fastify'
import { supabase } from '../supabase'

export async function userRoutes(server: FastifyInstance) {
  server.get('/users/:id', async (request: any, reply) => {
    const { id } = request.params
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return reply.status(404).send({ error: 'User not found' })
    return data
  })

  server.patch('/users/me', async (request: any, reply) => {
    try {
      const user = await request.jwtVerify()
      const { data, error } = await supabase
        .from('users')
        .update(request.body)
        .eq('id', user.sub)
        .select()
        .single()
      if (error) return reply.status(400).send({ error: error.message })
      return data
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}
