import '@opentelemetry/auto-instrumentations-node/register'

import '../broker/subscriber.ts'

import { fastify } from 'fastify'
import { fastifyCors } from '@fastify/cors'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'

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
  return 'OK'
})

app.listen({ host: '0.0.0.0', port: 3334 }).then(() => {
  console.log('[Invoices] HTTP Server running!')
})
