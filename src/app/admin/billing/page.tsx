import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdminUser } from "@/lib/metadata-store";
import { listCostsByService, listServiceUsageTypes } from "@/lib/billing-cost-explorer";

function utcDate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatUsage(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ service?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/");
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    redirect("/gallery");
  }

  const now = new Date();
  const start = utcDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const end = utcDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)));
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedService = resolvedSearchParams?.service?.trim() || "";

  const serviceRows = await listCostsByService({ start, end });
  const usageTypeRows = selectedService
    ? await listServiceUsageTypes({ start, end, service: selectedService })
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-2">
        <Link href="/admin" className="text-sm text-neutral-500 underline">
          Back to admin
        </Link>
        <h1 className="text-2xl font-semibold">AWS billing</h1>
        <p className="text-neutral-600">
          Month-to-date unblended cost, grouped by service. Click a service to see usage type line items.
        </p>
        <p className="text-xs text-neutral-500">
          Window: {start} to {end} (UTC)
        </p>
      </header>

      <section className="rounded border border-neutral-200 p-4">
        <h2 className="mb-3 text-sm font-medium">Charges by service</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="px-2 py-2 font-medium">Service</th>
                <th className="px-2 py-2 font-medium">Amount in USD</th>
              </tr>
            </thead>
            <tbody>
              {serviceRows.map((row) => (
                <tr key={row.key} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-2 py-2">
                    <Link href={`/admin/billing?service=${encodeURIComponent(row.key)}`} className="underline">
                      {row.key}
                    </Link>
                  </td>
                  <td className="px-2 py-2">{formatUsd(row.amountUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-neutral-200 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Usage type breakdown</h2>
          {selectedService ? (
            <Link href="/admin/billing" className="text-xs text-neutral-500 underline">
              Clear selection
            </Link>
          ) : null}
        </div>
        {!selectedService ? (
          <p className="text-xs text-neutral-500">Select a service above to view usage-level line items.</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-neutral-500">{selectedService}</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-neutral-200 text-neutral-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Description</th>
                    <th className="px-2 py-2 font-medium">Usage quantity</th>
                    <th className="px-2 py-2 font-medium">Amount in USD</th>
                  </tr>
                </thead>
                <tbody>
                  {usageTypeRows.map((row) => (
                    <tr key={row.key} className="border-b border-neutral-100 last:border-b-0">
                      <td className="px-2 py-2">{row.key}</td>
                      <td className="px-2 py-2">
                        {formatUsage(row.usageQuantity)} {row.usageUnit}
                      </td>
                      <td className="px-2 py-2">{formatUsd(row.amountUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
