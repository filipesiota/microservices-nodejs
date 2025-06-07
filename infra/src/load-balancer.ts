import * as awsx from '@pulumi/awsx'

import { cluster } from './cluster'

export const appLoadBalancer = new awsx.classic.lb.ApplicationLoadBalancer('app-load-balancer', {
  securityGroups: cluster.securityGroups
})

export const networkLoadBalancer = new awsx.classic.lb.NetworkLoadBalancer('network-load-balancer', {
  subnets: cluster.vpc.publicSubnetIds
})
