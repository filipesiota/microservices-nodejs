import * as awsx from '@pulumi/awsx'
import * as pulumi from '@pulumi/pulumi'

import { cluster } from '../cluster'
import { kongDockerImage } from '../images/kong'
import { ordersHttpListener } from './orders'
import { appLoadBalancer } from '../load-balancer'

const kongProxyTargetGroup = appLoadBalancer.createTargetGroup('kong-proxy-target', {
  port: 8000,
  protocol: 'HTTP',
  healthCheck: {
    path: '/orders/health',
    protocol: 'HTTP'
  }
})

export const kongProxyHttpListener = appLoadBalancer.createListener('kong-proxy-listener', {
  port: 80,
  protocol: 'HTTP',
  targetGroup: kongProxyTargetGroup
})

const kongAdminTargetGroup = appLoadBalancer.createTargetGroup('kong-admin-target', {
  port: 8002,
  protocol: 'HTTP',
  healthCheck: {
    path: '/',
    protocol: 'HTTP'
  }
})

export const kongAdminHttpListener = appLoadBalancer.createListener('kong-admin-listener', {
  port: 8002,
  protocol: 'HTTP',
  targetGroup: kongAdminTargetGroup
})

const kongAdminAPITargetGroup = appLoadBalancer.createTargetGroup('kong-admin-api-target', {
  port: 8001,
  protocol: 'HTTP',
  healthCheck: {
    path: '/',
    protocol: 'HTTP'
  }
})

export const kongAdminAPIHttpListener = appLoadBalancer.createListener('kong-admin-api-listener', {
  port: 8001,
  protocol: 'HTTP',
  targetGroup: kongAdminAPITargetGroup
})

export const kongService = new awsx.classic.ecs.FargateService('fargate-kong', {
  cluster,
  desiredCount: 1,
  waitForSteadyState: false,
  taskDefinitionArgs: {
    container: {
      image: kongDockerImage.ref,
      cpu: 256,
      memory: 512,
      portMappings: [
        kongProxyHttpListener,
        kongAdminHttpListener,
        kongAdminAPIHttpListener
      ],
      environment: [
        {
          name: 'KONG_DATABASE',
          value: 'off'
        },
        {
          name: 'KONG_ADMIN_LISTEN',
          value: '0.0.0.0:8001'
        },
        {
          name: 'ORDERS_SERVICE_URL',
          value: pulumi.interpolate`http://${ordersHttpListener.endpoint.hostname}:${ordersHttpListener.endpoint.port}`
        }
      ]
    }
  }
})
