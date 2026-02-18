#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { EnvironmentConfig, getEnvironmentConfig } from "../lib/config";
import { NetworkStack } from "../lib/network-stack";
import { DataStack } from "../lib/data-stack";
import { AppStack } from "../lib/app-stack";
import { ObservabilityStack } from "../lib/observability-stack";
import { CiCdStack } from "../lib/cicd-stack";

const app = new cdk.App();
const envName = app.node.tryGetContext("env") ?? "dev";
const imageTag = app.node.tryGetContext("imageTag") ?? "latest";
const certificateArn = app.node.tryGetContext("certificateArn");
const config: EnvironmentConfig = getEnvironmentConfig(envName);

if (!certificateArn) {
  throw new Error("Missing context 'certificateArn'. Example: -c certificateArn=arn:aws:acm:...");
}

const stackEnv: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region,
};

const stackPrefix = `${config.appName}-${config.environment}`;

const network = new NetworkStack(app, `${stackPrefix}-network`, {
  env: stackEnv,
  config,
});

const data = new DataStack(app, `${stackPrefix}-data`, {
  env: stackEnv,
  config,
  vpc: network.vpc,
  appSecurityGroup: network.appSecurityGroup,
});

const application = new AppStack(app, `${stackPrefix}-app`, {
  env: stackEnv,
  config,
  vpc: network.vpc,
  cluster: network.cluster,
  albSecurityGroup: network.albSecurityGroup,
  appSecurityGroup: network.appSecurityGroup,
  imageBucket: data.imageBucket,
  dbInstance: data.dbInstance,
  dbCredentialsSecret: data.dbCredentialsSecret,
  appSecret: data.appSecret,
  rateLimitTable: data.rateLimitTable,
  imageTag,
  certificateArn,
});
application.addDependency(network);
application.addDependency(data);

new ObservabilityStack(app, `${stackPrefix}-observability`, {
  env: stackEnv,
  config,
  service: application.service,
  loadBalancer: application.loadBalancer,
  targetGroup: application.targetGroup,
});

if (config.environment === "dev") {
  new CiCdStack(app, `${config.appName}-cicd`, {
    env: stackEnv,
    config,
    githubOrg: "tangles-0",
    githubRepo: "latex",
  });
}

