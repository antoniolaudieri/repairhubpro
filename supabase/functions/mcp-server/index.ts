// MCP Server exposing full database access via API Key
import { Hono } from "npm:hono@4";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MCP_API_KEY = Deno.env.get("MCP_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

type Filter = { column: string; op: string; value: unknown };
function applyFilters(q: any, filters?: Filter[]) {
  if (!filters) return q;
  for (const f of filters) {
    switch (f.op) {
      case "eq": q = q.eq(f.column, f.value); break;
      case "neq": q = q.neq(f.column, f.value); break;
      case "gt": q = q.gt(f.column, f.value); break;
      case "gte": q = q.gte(f.column, f.value); break;
      case "lt": q = q.lt(f.column, f.value); break;
      case "lte": q = q.lte(f.column, f.value); break;
      case "like": q = q.like(f.column, String(f.value)); break;
      case "ilike": q = q.ilike(f.column, String(f.value)); break;
      case "is": q = q.is(f.column, f.value as any); break;
      case "in": q = q.in(f.column, f.value as any[]); break;
      default: throw new Error(`Unsupported operator: ${f.op}`);
    }
  }
  return q;
}

const filterSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      column: { type: "string" },
      op: { type: "string", enum: ["eq","neq","gt","gte","lt","lte","like","ilike","is","in"] },
      value: {},
    },
    required: ["column", "op", "value"],
  },
};

const mcp = new McpServer({ name: "lovable-db-mcp", version: "1.0.0" });

mcp.tool("list_tables", {
  description: "List all tables exposed by the database",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SERVICE_ROLE}`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    const json = await res.json();
    return ok({ tables: Object.keys(json?.definitions ?? {}) });
  },
});

mcp.tool("describe_table", {
  description: "Describe columns of a table",
  inputSchema: { type: "object", properties: { table: { type: "string" } }, required: ["table"] },
  handler: async (args: any) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SERVICE_ROLE}`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    const json = await res.json();
    const def = json?.definitions?.[args.table];
    if (!def) throw new Error(`Table not found: ${args.table}`);
    return ok(def);
  },
});

mcp.tool("query_table", {
  description: "SELECT rows from a table with optional filters, order, limit",
  inputSchema: {
    type: "object",
    properties: {
      table: { type: "string" },
      columns: { type: "string", description: "Comma-separated columns or '*'" },
      filters: filterSchema,
      order_by: { type: "string" },
      ascending: { type: "boolean" },
      limit: { type: "number" },
      offset: { type: "number" },
    },
    required: ["table"],
  },
  handler: async (args: any) => {
    let q = admin.from(args.table).select(args.columns ?? "*");
    q = applyFilters(q, args.filters);
    if (args.order_by) q = q.order(args.order_by, { ascending: args.ascending ?? true });
    if (args.limit) q = q.limit(args.limit);
    if (args.offset != null && args.limit) q = q.range(args.offset, args.offset + args.limit - 1);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ok({ rows: data });
  },
});

mcp.tool("count_rows", {
  description: "Count rows in a table with optional filters",
  inputSchema: { type: "object", properties: { table: { type: "string" }, filters: filterSchema }, required: ["table"] },
  handler: async (args: any) => {
    let q = admin.from(args.table).select("*", { count: "exact", head: true });
    q = applyFilters(q, args.filters);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return ok({ count });
  },
});

mcp.tool("insert_row", {
  description: "Insert one or multiple rows into a table",
  inputSchema: {
    type: "object",
    properties: { table: { type: "string" }, values: {} },
    required: ["table", "values"],
  },
  handler: async (args: any) => {
    const { data, error } = await admin.from(args.table).insert(args.values).select();
    if (error) throw new Error(error.message);
    return ok({ inserted: data });
  },
});

mcp.tool("update_rows", {
  description: "UPDATE rows matching filters. Filters are REQUIRED.",
  inputSchema: {
    type: "object",
    properties: { table: { type: "string" }, values: { type: "object" }, filters: filterSchema },
    required: ["table", "values", "filters"],
  },
  handler: async (args: any) => {
    if (!args.filters?.length) throw new Error("filters required to prevent full-table updates");
    let q = admin.from(args.table).update(args.values);
    q = applyFilters(q, args.filters);
    const { data, error } = await q.select();
    if (error) throw new Error(error.message);
    return ok({ updated: data });
  },
});

mcp.tool("delete_rows", {
  description: "DELETE rows matching filters. Filters are REQUIRED.",
  inputSchema: {
    type: "object",
    properties: { table: { type: "string" }, filters: filterSchema },
    required: ["table", "filters"],
  },
  handler: async (args: any) => {
    if (!args.filters?.length) throw new Error("filters required to prevent full-table deletes");
    let q = admin.from(args.table).delete();
    q = applyFilters(q, args.filters);
    const { data, error } = await q.select();
    if (error) throw new Error(error.message);
    return ok({ deleted: data });
  },
});

const transport = new StreamableHttpTransport();
const mcpHandler = transport.bind(mcp);

const app = new Hono();
app.options("/*", () => new Response("ok", { headers: corsHeaders }));

app.use("/*", async (c, next) => {
  const auth = c.req.header("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || token !== MCP_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  await next();
});

app.all("/*", async (c) => {
  const res = await mcpHandler(c.req.raw);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});

Deno.serve(app.fetch);
