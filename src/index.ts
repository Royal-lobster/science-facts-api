import { Hono } from "hono"
import { cors } from "hono/cors"
import { serve } from "@hono/node-server"
import factsData from "./data/facts.json" with { type: "json" }

// Types
interface Fact {
  id: number
  text: string
  category: string
  source_url?: string
  source_file?: string
}

// Add IDs to facts
const facts: Fact[] = (factsData as Omit<Fact, "id">[]).map((f, i) => ({
  ...f,
  id: i + 1
}))

const categories = [...new Set(facts.map((f) => f.category))].sort()

// Create app
const app = new Hono()

// CORS
app.use("*", cors())

// Root - API info
app.get("/", (c) =>
  c.json({
    name: "Science Facts API",
    version: "1.0.0",
    facts: facts.length,
    endpoints: {
      "GET /facts": "Get facts (?limit, ?offset)",
      "GET /facts/random": "Random fact(s) (?count)",
      "GET /facts/search": "Search (?q=query)",
      "GET /facts/categories": "List categories",
      "GET /facts/category/:name": "By category",
      "GET /facts/:id": "By ID",
      "GET /stats": "Statistics"
    }
  })
)

// Paginated facts
app.get("/facts", (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") ?? "100"), 1000)
  const offset = parseInt(c.req.query("offset") ?? "0")
  const paginated = facts.slice(offset, offset + limit)

  return c.json({
    data: paginated,
    pagination: {
      total: facts.length,
      limit,
      offset,
      hasMore: offset + limit < facts.length
    }
  })
})

// Random fact(s)
app.get("/facts/random", (c) => {
  const count = Math.min(parseInt(c.req.query("count") ?? "1"), 100)
  const result: Fact[] = []
  const indices = new Set<number>()

  while (result.length < count && result.length < facts.length) {
    const idx = Math.floor(Math.random() * facts.length)
    if (!indices.has(idx)) {
      indices.add(idx)
      result.push(facts[idx])
    }
  }

  return c.json({ data: count === 1 ? result[0] : result })
})

// Search
app.get("/facts/search", (c) => {
  const query = c.req.query("q")
  if (!query) {
    return c.json({ error: "Missing 'q' parameter" }, 400)
  }

  const q = query.toLowerCase()
  const results = facts.filter((f) => f.text.toLowerCase().includes(q))
  return c.json({ data: results, count: results.length, query })
})

// Categories
app.get("/facts/categories", (c) =>
  c.json({ data: categories, count: categories.length })
)

// By category
app.get("/facts/category/:name", (c) => {
  const category = c.req.param("name").toLowerCase()
  const matched = facts.filter((f) => f.category.toLowerCase() === category)

  if (matched.length === 0) {
    return c.json({ error: `Category '${category}' not found` }, 404)
  }

  return c.json({ data: matched, category: c.req.param("name"), count: matched.length })
})

// By ID
app.get("/facts/:id", (c) => {
  const id = parseInt(c.req.param("id"))
  if (isNaN(id)) {
    return c.json({ error: "Invalid ID" }, 400)
  }

  const fact = facts.find((f) => f.id === id)
  if (!fact) {
    return c.json({ error: `Fact ${id} not found` }, 404)
  }

  return c.json({ data: fact })
})

// Stats
app.get("/stats", (c) =>
  c.json({
    totalFacts: facts.length,
    categories: categories.length,
    uniqueSources: 13
  })
)

// Start server
const port = parseInt(process.env.PORT ?? "3000")
console.log(`🔬 Science Facts API running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

export default app
