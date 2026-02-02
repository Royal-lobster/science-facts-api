import { Hono } from "hono"
import { cors } from "hono/cors"
import { handle } from "@hono/vercel"

// Types
interface Fact {
  id: number
  text: string
  category: string
  source_url?: string
  source_file?: string
}

// Fetch facts from GitHub (cached)
let factsCache: Fact[] | null = null

const loadFacts = async (): Promise<Fact[]> => {
  if (factsCache) return factsCache

  const res = await fetch(
    "https://raw.githubusercontent.com/Royal-lobster/science-facts-project/main/facts.json"
  )
  const data = await res.json()
  factsCache = (data as Omit<Fact, "id">[]).map((f, i) => ({ ...f, id: i + 1 }))
  return factsCache
}

// Create app
const app = new Hono().basePath("/api")

app.use("*", cors())

// Root
app.get("/", async (c) => {
  const facts = await loadFacts()
  const categories = [...new Set(facts.map((f) => f.category))].sort()

  return c.json({
    name: "Science Facts API",
    version: "1.0.0",
    facts: facts.length,
    categories: categories.length,
    endpoints: {
      "GET /api/facts": "Get facts (?limit, ?offset)",
      "GET /api/facts/random": "Random fact(s) (?count)",
      "GET /api/facts/search": "Search (?q=query)",
      "GET /api/facts/categories": "List categories",
      "GET /api/facts/category/:name": "By category",
      "GET /api/facts/:id": "By ID",
      "GET /api/stats": "Statistics"
    }
  })
})

// Paginated facts
app.get("/facts", async (c) => {
  const facts = await loadFacts()
  const limit = Math.min(parseInt(c.req.query("limit") ?? "100"), 1000)
  const offset = parseInt(c.req.query("offset") ?? "0")
  const paginated = facts.slice(offset, offset + limit)

  return c.json({
    data: paginated,
    pagination: { total: facts.length, limit, offset, hasMore: offset + limit < facts.length }
  })
})

// Random
app.get("/facts/random", async (c) => {
  const facts = await loadFacts()
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
app.get("/facts/search", async (c) => {
  const facts = await loadFacts()
  const query = c.req.query("q")
  if (!query) return c.json({ error: "Missing 'q' parameter" }, 400)

  const q = query.toLowerCase()
  const results = facts.filter((f) => f.text.toLowerCase().includes(q))
  return c.json({ data: results, count: results.length, query })
})

// Categories
app.get("/facts/categories", async (c) => {
  const facts = await loadFacts()
  const categories = [...new Set(facts.map((f) => f.category))].sort()
  return c.json({ data: categories, count: categories.length })
})

// By category
app.get("/facts/category/:name", async (c) => {
  const facts = await loadFacts()
  const category = c.req.param("name").toLowerCase()
  const matched = facts.filter((f) => f.category.toLowerCase() === category)

  if (matched.length === 0) return c.json({ error: `Category '${category}' not found` }, 404)
  return c.json({ data: matched, category: c.req.param("name"), count: matched.length })
})

// By ID
app.get("/facts/:id", async (c) => {
  const facts = await loadFacts()
  const id = parseInt(c.req.param("id"))
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400)

  const fact = facts.find((f) => f.id === id)
  if (!fact) return c.json({ error: `Fact ${id} not found` }, 404)
  return c.json({ data: fact })
})

// Stats
app.get("/stats", async (c) => {
  const facts = await loadFacts()
  const categories = [...new Set(facts.map((f) => f.category))].sort()
  return c.json({ totalFacts: facts.length, categories: categories.length, uniqueSources: 13 })
})

export const GET = handle(app)
export const POST = handle(app)
export default app
