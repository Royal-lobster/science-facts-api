import { Hono } from "hono"
import { cors } from "hono/cors"
import { handle } from "hono/vercel"

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

// Telegram helper
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const telegram = async (method: string, body: object) => {
  if (!BOT_TOKEN) return { ok: false }
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  return res.json()
}

const formatFact = (fact: Fact) => {
  let msg = `🔬 *${fact.category.replace(/_/g, " ")}*\n\n${fact.text}`
  if (fact.source_url) msg += `\n\n[Source](${fact.source_url})`
  return msg
}

// Create app
const app = new Hono()

app.use("*", cors())

// ==================== API ROUTES ====================

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
      "GET /facts": "Get facts (?limit, ?offset)",
      "GET /facts/random": "Random fact(s) (?count)",
      "GET /facts/search": "Search (?q=query)",
      "GET /facts/categories": "List categories",
      "GET /facts/category/:name": "By category",
      "GET /facts/:id": "By ID",
      "GET /stats": "Statistics"
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

// ==================== TELEGRAM BOT ====================

app.post("/bot", async (c) => {
  const facts = await loadFacts()
  const categories = [...new Set(facts.map((f) => f.category))].sort()
  
  const update = await c.req.json()
  const message = update.message
  if (!message?.text) return c.json({ ok: true })
  
  const chatId = message.chat.id
  const text = message.text.trim()
  
  // /start
  if (text === "/start") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `🔬 *Science Facts Bot*\n\nI share fascinating science facts!\n\n*Commands:*\n/random - Random fact\n/random5 - 5 random facts\n/search <query> - Search facts\n/categories - List categories\n/category <name> - Facts by category\n/stats - Statistics`,
      parse_mode: "Markdown"
    })
    return c.json({ ok: true })
  }
  
  // /random
  if (text === "/random") {
    const fact = facts[Math.floor(Math.random() * facts.length)]
    await telegram("sendMessage", {
      chat_id: chatId,
      text: formatFact(fact),
      parse_mode: "Markdown",
      disable_web_page_preview: true
    })
    return c.json({ ok: true })
  }
  
  // /random5
  if (text === "/random5") {
    const indices = new Set<number>()
    while (indices.size < 5) indices.add(Math.floor(Math.random() * facts.length))
    for (const idx of indices) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: formatFact(facts[idx]),
        parse_mode: "Markdown",
        disable_web_page_preview: true
      })
    }
    return c.json({ ok: true })
  }
  
  // /search
  if (text.startsWith("/search ")) {
    const query = text.slice(8).trim()
    if (!query) {
      await telegram("sendMessage", { chat_id: chatId, text: "Usage: /search <query>" })
      return c.json({ ok: true })
    }
    const q = query.toLowerCase()
    const results = facts.filter((f) => f.text.toLowerCase().includes(q))
    if (results.length === 0) {
      await telegram("sendMessage", { chat_id: chatId, text: `No facts found for "${query}"` })
    } else {
      await telegram("sendMessage", { chat_id: chatId, text: `Found ${results.length} facts for "${query}":` })
      for (const fact of results.slice(0, 3)) {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: formatFact(fact),
          parse_mode: "Markdown",
          disable_web_page_preview: true
        })
      }
    }
    return c.json({ ok: true })
  }
  
  // /categories
  if (text === "/categories") {
    const list = categories.slice(0, 30).map((c) => c.replace(/_/g, " ")).join("\n• ")
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `📚 *Categories* (${categories.length} total)\n\n• ${list}\n\n_Use /category <name>_`,
      parse_mode: "Markdown"
    })
    return c.json({ ok: true })
  }
  
  // /category
  if (text.startsWith("/category ")) {
    const cat = text.slice(10).trim().toLowerCase().replace(/ /g, "_")
    const matched = facts.filter((f) => f.category.toLowerCase() === cat)
    if (matched.length === 0) {
      await telegram("sendMessage", { chat_id: chatId, text: "Category not found. Use /categories" })
    } else {
      await telegram("sendMessage", { chat_id: chatId, text: `📂 *${cat.replace(/_/g, " ")}* (${matched.length} facts)`, parse_mode: "Markdown" })
      for (const fact of matched.slice(0, 3)) {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: formatFact(fact),
          parse_mode: "Markdown",
          disable_web_page_preview: true
        })
      }
    }
    return c.json({ ok: true })
  }
  
  // /stats
  if (text === "/stats") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `📊 *Statistics*\n\n• Facts: ${facts.length.toLocaleString()}\n• Categories: ${categories.length}\n• Sources: 13`,
      parse_mode: "Markdown"
    })
    return c.json({ ok: true })
  }
  
  // Unknown or plain message → random fact
  const fact = facts[Math.floor(Math.random() * facts.length)]
  await telegram("sendMessage", {
    chat_id: chatId,
    text: formatFact(fact),
    parse_mode: "Markdown",
    disable_web_page_preview: true
  })
  return c.json({ ok: true })
})

export const runtime = "nodejs"

export const GET = handle(app)
export const POST = handle(app)
export default app
