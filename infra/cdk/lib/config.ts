export type EnvironmentName = "dev" | "prod";

export type EnvironmentConfig = {
  appName: string;
  environment: EnvironmentName;
  region: string;
  appDomain: string;
  cpu: number;
  memoryMiB: number;
  desiredCount: number;
  minTasks: number;
  maxTasks: number;
  dbAllocatedStorageGiB: number;
  dbInstanceType: string;
  dbMultiAz: boolean;
  dbBackupRetentionDays: number;
};

const BASE = {
  appName: "latex",
  region: "ap-southeast-2",
} as const;

const CONFIG_BY_ENV: Record<EnvironmentName, Omit<EnvironmentConfig, "environment">> = {
  dev: {
    ...BASE,
    appDomain: "dev.pics.latex.gg",
    cpu: 512,
    memoryMiB: 1024,
    desiredCount: 2,
    minTasks: 2,
    maxTasks: 4,
    dbAllocatedStorageGiB: 20,
    dbInstanceType: "t4g.medium",
    dbMultiAz: true,
    dbBackupRetentionDays: 7,
  },
  prod: {
    ...BASE,
    appDomain: "pics.latex.gg",
    cpu: 1024,
    memoryMiB: 2048,
    desiredCount: 2,
    minTasks: 2,
    maxTasks: 8,
    dbAllocatedStorageGiB: 50,
    dbInstanceType: "t4g.large",
    dbMultiAz: true,
    dbBackupRetentionDays: 14,
  },
};

export function getEnvironmentConfig(input: string): EnvironmentConfig {
  if (input !== "dev" && input !== "prod") {
    throw new Error(`Unsupported env '${input}'. Use -c env=dev or -c env=prod.`);
  }

  return {
    environment: input,
    ...CONFIG_BY_ENV[input],
  };
}

