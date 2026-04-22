import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, productsTable, ordersTable } from "@workspace/db";
import { GetStatsSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const [productAgg] = await db
    .select({
      total: sql<number>`count(*)::int`.as("total"),
      avgRating: sql<number>`coalesce(avg(${productsTable.rating}), 0)::float`.as(
        "avg_rating",
      ),
    })
    .from(productsTable);

  const [orderAgg] = await db
    .select({
      total: sql<number>`count(*)::int`.as("total"),
      revenue: sql<number>`coalesce(sum(${ordersTable.totalCents}), 0)::int`.as(
        "revenue",
      ),
    })
    .from(ordersTable);

  res.json(
    GetStatsSummaryResponse.parse({
      totalProducts: productAgg?.total ?? 0,
      totalOrders: orderAgg?.total ?? 0,
      totalRevenueCents: orderAgg?.revenue ?? 0,
      averageRating: productAgg?.avgRating ?? 0,
    }),
  );
});

export default router;
