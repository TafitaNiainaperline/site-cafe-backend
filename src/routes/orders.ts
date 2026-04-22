import { Router, type IRouter } from "express";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { db, ordersTable, productsTable } from "@workspace/db";
import type { OrderItemJson } from "@workspace/db";
import {
  CreateOrderBody,
  GetOrderParams,
  GetOrderResponse,
  ListOrdersResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/orders", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt));

  res.json(ListOrdersResponse.parse(rows));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.items.length === 0) {
    res.status(400).json({ error: "Order must contain at least one item" });
    return;
  }

  const productIds = parsed.data.items.map((it) => it.productId);
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  const items: OrderItemJson[] = [];
  let totalCents = 0;

  for (const it of parsed.data.items) {
    const product = products.find((p) => p.id === it.productId);
    if (!product) {
      res
        .status(400)
        .json({ error: `Product ${it.productId} not found` });
      return;
    }
    const lineTotal = product.priceCents * it.quantity;
    totalCents += lineTotal;
    items.push({
      productId: product.id,
      productName: product.name,
      quantity: it.quantity,
      priceCents: product.priceCents,
    });
  }

  const [created] = await db
    .insert(ordersTable)
    .values({
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      shippingAddress: parsed.data.shippingAddress,
      totalCents,
      status: "pending",
      items,
    })
    .returning();

  res.status(201).json(GetOrderResponse.parse(created));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(GetOrderResponse.parse(row));
});

export { router as ordersRouter };
export default router;
