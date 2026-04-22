import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  ListFeaturedProductsResponse,
  GetProductParams,
  GetProductResponse,
  CreateProductBody,
  ListCategoriesResponse,
  ListOriginsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.category) {
    conditions.push(eq(productsTable.category, params.data.category));
  }
  if (params.data.origin) {
    conditions.push(eq(productsTable.origin, params.data.origin));
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(productsTable)
          .where(and(...conditions))
          .orderBy(productsTable.id)
      : await db.select().from(productsTable).orderBy(productsTable.id);

  res.json(ListProductsResponse.parse(rows));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [created] = await db
    .insert(productsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(GetProductResponse.parse(created));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.featured, true))
    .orderBy(productsTable.id);

  res.json(ListFeaturedProductsResponse.parse(rows));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(GetProductResponse.parse(row));
});

router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      category: productsTable.category,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(productsTable)
    .groupBy(productsTable.category);

  res.json(ListCategoriesResponse.parse(rows));
});

router.get("/origins", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      origin: productsTable.origin,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(productsTable)
    .groupBy(productsTable.origin);

  res.json(ListOriginsResponse.parse(rows));
});

export default router;
