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
const desiredCountFromContext = app.node.tryGetContext("desiredCount");
const certificateArnFromContext = app.node.tryGetContext("certificateArn");
const certificateArnFromLegacyContext = app.node.tryGetContext("certArn");
const certificateArnFromEnv =
  process.env.CERT_ARN ??
  process.env.CERTIFICATE_ARN ??
  process.env.ACM_CERTIFICATE_ARN ??
  process.env.CDK_CERTIFICATE_ARN;

const certificateArn = (
  certificateArnFromContext ??
  certificateArnFromLegacyContext ??
  certificateArnFromEnv ??
  ""
).trim();
const config: EnvironmentConfig = getEnvironmentConfig(envName);
const desiredCountOverride =
  desiredCountFromContext === undefined ? undefined : Number.parseInt(String(desiredCountFromContext), 10);

if (desiredCountOverride !== undefined && (!Number.isFinite(desiredCountOverride) || desiredCountOverride < 0)) {
  throw new Error("Invalid desiredCount context. Use a non-negative integer, e.g. -c desiredCount=0");
}

if (!certificateArn) {
  throw new Error(
    [
      "Missing certificate ARN.",
      "Provide one of:",
      "- CDK context: -c certificateArn=arn:aws:acm:REGION:ACCOUNT:certificate/ID",
      "- Env var: CERT_ARN=arn:aws:acm:REGION:ACCOUNT:certificate/ID",
      "",
      "Note: older deployments may have used the legacy context key 'certArn'.",
    ].join("\n"),
  );
}

if (!certificateArnFromContext && certificateArnFromLegacyContext) {
  // eslint-disable-next-line no-console
  console.warn(
    "Warning: using legacy CDK context key 'certArn'. Please migrate to '-c certificateArn=...'.",
  );
}

console.log("Using container image: ", imageTag);

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
  desiredCountOverride,
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

