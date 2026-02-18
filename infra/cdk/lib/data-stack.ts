import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as rds from "aws-cdk-lib/aws-rds";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { EnvironmentConfig } from "./config";

type DataStackProps = cdk.StackProps & {
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  appSecurityGroup: ec2.ISecurityGroup;
  reuseDataResources?: boolean;
};

export class DataStack extends cdk.Stack {
  public readonly imageBucket: s3.IBucket;
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbCredentialsSecret: secretsmanager.ISecret;
  public readonly appSecret: secretsmanager.Secret;
  public readonly rateLimitTable: dynamodb.ITable;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const prefix = `${props.config.appName}-${props.config.environment}`;

    const dataKey = new kms.Key(this, "DataKey", {
      alias: `alias/${prefix}-data`,
      enableKeyRotation: true,
    });

    const bucketName = `${prefix}-images-${this.account}-${this.region}`;
    this.imageBucket = props.reuseDataResources
      ? s3.Bucket.fromBucketName(this, "ImageBucketImported", bucketName)
      : new s3.Bucket(this, "ImageBucket", {
          bucketName,
          encryption: s3.BucketEncryption.KMS,
          encryptionKey: dataKey,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          enforceSSL: true,
          versioned: true,
          lifecycleRules: [
            {
              noncurrentVersionExpiration: cdk.Duration.days(30),
            },
          ],
          removalPolicy: cdk.RemovalPolicy.RETAIN,
          autoDeleteObjects: false,
        });

    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: "RDS PostgreSQL security group",
      securityGroupName: `${prefix}-db-sg`,
    });
    dbSecurityGroup.addIngressRule(props.appSecurityGroup, ec2.Port.tcp(5432));

    this.dbInstance = new rds.DatabaseInstance(this, "Database", {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      databaseName: "latex",
      credentials: rds.Credentials.fromGeneratedSecret("latex_app"),
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        props.config.dbInstanceType.endsWith("large")
          ? ec2.InstanceSize.LARGE
          : ec2.InstanceSize.MEDIUM,
      ),
      allocatedStorage: props.config.dbAllocatedStorageGiB,
      maxAllocatedStorage: props.config.dbAllocatedStorageGiB * 4,
      storageEncrypted: true,
      multiAz: props.config.dbMultiAz,
      backupRetention: cdk.Duration.days(props.config.dbBackupRetentionDays),
      deleteAutomatedBackups: false,
      // Temporarily disabled to unblock iterative environment tear-down/recreate during setup.
      // Re-enable for production hardening once deployments are stable.
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      cloudwatchLogsExports: ["postgresql"],
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
    });
    this.dbCredentialsSecret = this.dbInstance.secret as secretsmanager.ISecret;

    this.appSecret = new secretsmanager.Secret(this, "AppRuntimeSecret", {
      secretName: `${prefix}/app/runtime`,
      description: "Runtime app secrets for latex",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "NEXTAUTH_SECRET",
        passwordLength: 64,
      },
    });

    const tableName = `${prefix}-rate-limit`;
    this.rateLimitTable = props.reuseDataResources
      ? dynamodb.Table.fromTableName(this, "RateLimitTableImported", tableName)
      : new dynamodb.Table(this, "RateLimitTable", {
          tableName,
          billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
          partitionKey: {
            name: "pk",
            type: dynamodb.AttributeType.STRING,
          },
          timeToLiveAttribute: "expiresAt",
          pointInTimeRecoverySpecification: {
            pointInTimeRecoveryEnabled: true,
          },
          encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
          encryptionKey: dataKey,
          removalPolicy:
            props.config.environment === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
  }
}

