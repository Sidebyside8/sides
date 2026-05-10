import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { userRoutes } from './routes/users'
import { matchRoutes } from './routes/matches'
import { messageRoutes } from './routes/messages'

const server = Fastify({ logger: true })

server.register(cors, { origin: '*' })

server.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'super-secret-dev-key',
})

server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

server.register(userRoutes)
server.register(matchRoutes)
server.register(messageRoutes)

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' })
    console.log('Server running at http://localhost:3001')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
