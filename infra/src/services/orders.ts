import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'

import { cluster } from '../cluster'
import { ordersDockerImage } from '../images/orders'
import { rabbitMQAmqpListener } from './rabbitmq'
import { appLoadBalancer } from '../load-balancer'

const ordersTargetGroup = appLoadBalancer.createTargetGroup('orders-target', {
  port: 3333,
  protocol: 'HTTP',
  healthCheck: {
    path: '/health',
    protocol: 'HTTP'
  }
})

export const ordersHttpListener = appLoadBalancer.createListener('orders-listener', {
  port: 3333,
  protocol: 'HTTP',
  targetGroup: ordersTargetGroup
})

export const ordersService = new awsx.classic.ecs.FargateService('fargate-orders', {
  cluster,
  desiredCount: 1,
  waitForSteadyState: false,
  taskDefinitionArgs: {
    container: {
      image: ordersDockerImage.ref,
      cpu: 256,
      memory: 512,
      portMappings: [
        ordersHttpListener
      ],
      environment: [
        {
          name: 'BROKER_URL',
          value: pulumi.interpolate`amqp://admin:admin@${rabbitMQAmqpListener.endpoint.hostname}:${rabbitMQAmqpListener.endpoint.port}`
        },
        {
          name: 'DATABASE_URL',
          value: 'postgresql://orders_owner:npg_lp5d0PTKRZHL@ep-spring-silence-a4wfmi0r.us-east-1.aws.neon.tech/orders?sslmode=require'
        },
        {
          name: 'OTEL_SERVICE_NAME',
          value: 'orders'
        },
        {
          name: 'OTEL_TRACES_EXPORTER',
          value: 'otlp'
        },
        {
          name: 'OTEL_EXPORTER_OTLP_ENDPOINT',
          value: 'https://otlp-gateway-prod-us-east-2.grafana.net/otlp'
        },
        {
          name: 'OTEL_EXPORTER_OTLP_HEADERS',
          value: 'Authorization=Basic MTI4MjE0NjpnbGNfZXlKdklqb2lNVFExTWpJeU55SXNJbTRpT2lKemRHRmpheTB4TWpneU1UUTJMVzkwWld3dGIyNWliMkZ5WkdsdVp5MW5jbUZtWVc1aExXMXBZM0p2YzJWeWRtbGpaWE10Ym05a1pXcHpJaXdpYXlJNkluSktNVGhaYlRKaU9IUXpOMWN5V1RaUlJYUXljblJwT0NJc0ltMGlPbnNpY2lJNkluQnliMlF0ZFhNdFpXRnpkQzB3SW4xOQ=='
        },
        {
          name: 'OTEL_RESOURCE_ATTRIBUTES',
          value: 'service.name=orders,service.namespace=microservices-nodejs,deployment.environment=production'
        },
        {
          name: 'OTEL_NODE_RESOURCE_DETECTORS',
          value: 'env,host,os'
        },
        {
          name: 'OTEL_NODE_ENABLED_INSTRUMENTATIONS',
          value: 'http,fastify,pg,amqplib'
        }
      ]
    }
  }
})
