import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

type AttemptWindow = {
  count: number;
  resetAt: number;
};

const fallbackAttempts = new Map<string, AttemptWindow>();
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 5 * 60 * 1000);
const MAX_ATTEMPTS = Number(process.env.RATE_LIMIT_MAX_ATTEMPTS ?? 20);
const TABLE_NAME = process.env.RATE_LIMIT_TABLE;
const BACKEND = process.env.RATE_LIMIT_BACKEND ?? "memory";

let ddbClient: DynamoDBClient | null = null;

function getClient(): DynamoDBClient | null {
  if (!TABLE_NAME || BACKEND !== "dynamodb") {
    return null;
  }
  if (!ddbClient) {
    ddbClient = new DynamoDBClient({});
  }
  return ddbClient;
}

export async function checkLoginRateLimit(key: string): Promise<boolean> {
  const client = getClient();
  if (!client || !TABLE_NAME) {
    return checkLoginRateLimitMemory(key);
  }

  const now = Date.now();
  const pk = `login#${key}`;
  const existing = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { pk: { S: pk } },
      ConsistentRead: true,
      ProjectionExpression: "attemptCount, resetAt",
    }),
  );

  const resetAt = Number(existing.Item?.resetAt?.N ?? "0");
  if (!existing.Item || resetAt <= now) {
    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: { S: pk },
          attemptCount: { N: "1" },
          resetAt: { N: String(now + WINDOW_MS) },
          expiresAt: { N: String(Math.floor((now + WINDOW_MS) / 1000)) },
        },
      }),
    );
    return true;
  }

  const updated = await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { pk: { S: pk } },
      UpdateExpression: "SET attemptCount = attemptCount + :inc, expiresAt = :ttl",
      ExpressionAttributeValues: {
        ":inc": { N: "1" },
        ":ttl": { N: String(Math.floor(resetAt / 1000)) },
      },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  const count = Number(updated.Attributes?.attemptCount?.N ?? "0");
  return count <= MAX_ATTEMPTS;
}

export async function resetLoginRateLimit(key: string): Promise<void> {
  const client = getClient();
  if (!client || !TABLE_NAME) {
    fallbackAttempts.delete(key);
    return;
  }

  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: { S: `login#${key}` },
        attemptCount: { N: "0" },
        resetAt: { N: String(Date.now()) },
        expiresAt: { N: String(Math.floor(Date.now() / 1000) + 60) },
      },
    }),
  );
}

function checkLoginRateLimitMemory(key: string): boolean {
  const now = Date.now();
  const entry = fallbackAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    fallbackAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

