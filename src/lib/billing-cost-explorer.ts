import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";

type CostRow = {
  key: string;
  amountUsd: number;
  usageQuantity: number;
  usageUnit: string;
};

const BILLING_ROLE_ARN = process.env.BILLING_ROLE_ARN?.trim();
const BILLING_CE_REGION = process.env.BILLING_CE_REGION?.trim() || "us-east-1";

let ceClient: CostExplorerClient | null = null;

function getClient(): CostExplorerClient {
  if (ceClient) {
    return ceClient;
  }

  const credentials = BILLING_ROLE_ARN
    ? fromTemporaryCredentials({
        params: {
          RoleArn: BILLING_ROLE_ARN,
          RoleSessionName: "latex-billing-read",
        },
      })
    : undefined;

  ceClient = new CostExplorerClient({
    region: BILLING_CE_REGION,
    credentials,
  });
  return ceClient;
}

function parseGroups(groups: { Keys?: string[]; Metrics?: Record<string, { Amount?: string; Unit?: string }> }[]): CostRow[] {
  return groups.map((group) => {
    const amount = Number(group.Metrics?.UnblendedCost?.Amount ?? "0");
    const quantity = Number(group.Metrics?.UsageQuantity?.Amount ?? "0");
    return {
      key: group.Keys?.[0] ?? "Unknown",
      amountUsd: Number.isFinite(amount) ? amount : 0,
      usageQuantity: Number.isFinite(quantity) ? quantity : 0,
      usageUnit: group.Metrics?.UsageQuantity?.Unit ?? "N/A",
    };
  });
}

export async function listCostsByService(input: { start: string; end: string }): Promise<CostRow[]> {
  const response = await getClient().send(
    new GetCostAndUsageCommand({
      TimePeriod: {
        Start: input.start,
        End: input.end,
      },
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost", "UsageQuantity"],
      GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
    }),
  );

  const groups = response.ResultsByTime?.[0]?.Groups ?? [];
  return parseGroups(groups).sort((a, b) => b.amountUsd - a.amountUsd);
}

export async function listServiceUsageTypes(input: {
  start: string;
  end: string;
  service: string;
}): Promise<CostRow[]> {
  const response = await getClient().send(
    new GetCostAndUsageCommand({
      TimePeriod: {
        Start: input.start,
        End: input.end,
      },
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost", "UsageQuantity"],
      Filter: {
        Dimensions: {
          Key: "SERVICE",
          Values: [input.service],
        },
      },
      GroupBy: [{ Type: "DIMENSION", Key: "USAGE_TYPE" }],
    }),
  );

  const groups = response.ResultsByTime?.[0]?.Groups ?? [];
  return parseGroups(groups).sort((a, b) => b.amountUsd - a.amountUsd);
}
