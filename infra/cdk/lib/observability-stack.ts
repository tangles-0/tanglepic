import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as sns from "aws-cdk-lib/aws-sns";
import { EnvironmentConfig } from "./config";

type ObservabilityStackProps = cdk.StackProps & {
  config: EnvironmentConfig;
  service: ecs.FargateService;
  loadBalancer: elbv2.ApplicationLoadBalancer;
  targetGroup: elbv2.ApplicationTargetGroup;
};

export class ObservabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const prefix = `${props.config.appName}-${props.config.environment}`;
    const alarmTopic = new sns.Topic(this, "AlarmTopic", {
      topicName: `${prefix}-alarms`,
    });

    const cpuAlarm = new cloudwatch.Alarm(this, "HighCpu", {
      alarmName: `${prefix}-high-cpu`,
      metric: props.service.metricCpuUtilization({ period: cdk.Duration.minutes(1) }),
      threshold: 80,
      evaluationPeriods: 3,
      datapointsToAlarm: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    cpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    const unhealthyHostCount = props.targetGroup.metrics.unhealthyHostCount({
      statistic: "max",
      period: cdk.Duration.minutes(1),
    });
    const unhealthyHostsAlarm = new cloudwatch.Alarm(this, "UnhealthyHosts", {
      alarmName: `${prefix}-unhealthy-hosts`,
      metric: unhealthyHostCount,
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });
    unhealthyHostsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `${prefix}-dashboard`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: "ECS CPU/Memory",
            left: [props.service.metricCpuUtilization(), props.service.metricMemoryUtilization()],
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: "ALB Request Count",
            left: [props.loadBalancer.metrics.requestCount()],
          }),
        ],
      ],
    });
  }
}

