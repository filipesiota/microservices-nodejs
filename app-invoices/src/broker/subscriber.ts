import { orders } from "./channels/orders.ts";

/**
 * Não quero que ele informe  automaticamente se a
 * mensagem foi recebida com sucesso ou não. Eu quem
 * vou controlar isso e dizer, se der erro, tenta
 * daqui a 5 minutos, por exemplo.
 */
orders.consume('orders', async message => {
  if (!message) {
    return null
  }

  console.log(message.content.toString())

  orders.ack(message)
}, {
  noAck: false
})
