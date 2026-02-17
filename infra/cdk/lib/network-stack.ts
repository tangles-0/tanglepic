import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { EnvironmentConfig } from "./config";

type NetworkStackProps = cdk.StackProps & {
  config: EnvironmentConfig;
};

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly appSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const prefix = `${props.config.appName}-${props.config.environment}`;
    this.vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `${prefix}-vpc`,
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { name: "private-egress", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        { name: "private-isolated", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
    });

    this.albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: true,
      description: "ALB security group",
      securityGroupName: `${prefix}-alb-sg`,
    });
    this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    this.appSecurityGroup = new ec2.SecurityGroup(this, "AppSecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: true,
      description: "ECS app task security group",
      securityGroupName: `${prefix}-app-sg`,
    });
    this.appSecurityGroup.addIngressRule(this.albSecurityGroup, ec2.Port.tcp(3000));

    this.cluster = new ecs.Cluster(this, "Cluster", {
      vpc: this.vpc,
      clusterName: `${prefix}-cluster`,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });
  }
}

