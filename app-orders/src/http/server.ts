import '@opentelemetry/auto-instrumentations-node/register'

import { trace } from '@opentelemetry/api'
import { randomUUID } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'
import { fastify } from 'fastify'
import { fastifyCors } from '@fastify/cors'
import { z } from 'zod'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'
import { db } from '../db/client.ts'
import { schema } from '../db/schema/index.ts'
import { dispatchOrderCreated } from '../broker/messages/order-created.ts'
import { tracer } from '../tracer/tracer.ts'

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(fastifyCors, { origin: '*' })

/**
 * Necessário para:
 * 
 * - Escalonamento horizontal:
 *    Quando uma nova instância é criada, o load balancer utiliza essa rota
 *    para verificar se a instância está pronta para receber requisições.
 * 
 * - Deploy Blue-green:
 *    Ao subir uma nova versão da aplicação, o load balancer fica testando essa rota
 *    para saber se a nova versão está utilizável. Quando estiver, ele começa a redirecionar
 *    o tráfego para a nova versão e finaliza a versão anterior após o redirecionamento completo.
 */
app.get('/health', () => {
  console.log('Orders service reached!');
  return 'OK'
})

app.post('/orders', {
  schema: {
    body: z.object({
      amount: z.coerce.number()
    })
  }
}, async (request, reply) => {
  const { amount } = request.body

  console.log('Creating an order with amount', amount)

  const orderId = randomUUID()
  const customerId = '28b99e39-807b-425a-8144-35e852c60a32'

  await db.insert(schema.orders).values([{
    id: orderId,
    customerId: customerId,
    amount,
  }])

  const span = tracer.startSpan('problems here')

  span.setAttribute('mode', 'testing')

  await setTimeout(2000)

  span.end()

  trace.getActiveSpan()?.setAttribute('order_id', orderId)

  dispatchOrderCreated({
    orderId,
    amount,
    customer: {
      id: customerId
    }
  })

  return reply.status(201).send()
})

app.listen({ host: '0.0.0.0', port: 3333 }).then(() => {
  console.log('[Orders] HTTP Server running!')
})
