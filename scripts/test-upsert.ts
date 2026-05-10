import { upsertWorkplaceAdjustment, getWorkplaceAdjustments } from "../server/db";

async function main() {
  console.log("Testing upsert with userId=1, workplaceId=1, month=5, year=2026, overrideHours=100");
  
  const result = await upsertWorkplaceAdjustment(1, 1, 5, 2026, 100, "Teste de override");
  console.log("Upsert result:", JSON.stringify(result, null, 2));

  const adjustments = await getWorkplaceAdjustments(1, 5, 2026);
  console.log("Adjustments after upsert:", JSON.stringify(adjustments, null, 2));
  
  process.exit(0);
}

main().catch(console.error);
