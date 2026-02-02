import { Hono } from "hono"
import { handle } from "hono/vercel"

const app = new Hono()

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const API_URL = "https://science-facts-api.vercel.app"

// Telegram API helper
const telegram = async (method: string, body: object) => {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  return res.json()
}

// Fetch facts from our API
const fetchFacts = async (endpoint: string) => {
  const res = await fetch(`${API_URL}${endpoint}`)
  return res.json()
}

// Format a fact for Telegram
const formatFact = (fact: { text: string; category: string; source_url?: string }) => {
  let msg = `🔬 *${fact.category.replace(/_/g, " ")}*\n\n${fact.text}`
  if (fact.source_url) {
    msg += `\n\n[Source](${fact.source_url})`
  }
  return msg
}

// Handle incoming updates
app.post("/", async (c) => {
  const update = await c.req.json()
  
  const message = update.message
  if (!message?.text) return c.json({ ok: true })
  
  const chatId = message.chat.id
  const text = message.text.trim()
  
  // /start command
  if (text === "/start") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `🔬 *Science Facts Bot*\n\nI can share fascinating science facts with you!\n\n*Commands:*\n/random - Get a random fact\n/random5 - Get 5 random facts\n/search <query> - Search for facts\n/categories - List all categories\n/category <name> - Facts from a category\n/stats - Dataset statistics`,
      parse_mode: "Markdown"
    })
    return c.json({ ok: true })
  }
  
  // /random command
  if (text === "/random") {
    const data = await fetchFacts("/facts/random")
    await telegram("sendMessage", {
      chat_id: chatId,
      text: formatFact(data.data),
      parse_mode: "Markdown",
      disable_web_page_preview: true
    })
    return c.json({ ok: true })
  }
  
  // /random5 command
  if (text === "/random5") {
    const data = await fetchFacts("/facts/random?count=5")
    const facts = data.data as any[]
    for (const fact of facts) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: formatFact(fact),
        parse_mode: "Markdown",
        disable_web_page_preview: true
      })
    }
    return c.json({ ok: true })
  }
  
  // /search command
  if (text.startsWith("/search ")) {
    const query = text.slice(8).trim()
    if (!query) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: "Usage: /search <query>\nExample: /search quantum"
      })
      return c.json({ ok: true })
    }
    
    const data = await fetchFacts(`/facts/search?q=${encodeURIComponent(query)}`)
    if (data.count === 0) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: `No facts found for "${query}"`
      })
    } else {
      const facts = data.data.slice(0, 3) as any[]
      await telegram("sendMessage", {
        chat_id: chatId,
        text: `Found ${data.count} facts for "${query}". Here are the first ${facts.length}:`
      })
      for (const fact of facts) {
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
  
  // /categories command
  if (text === "/categories") {
    const data = await fetchFacts("/facts/categories")
    const cats = (data.data as string[]).slice(0, 30).map(c => c.replace(/_/g, " ")).join("\n• ")
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `📚 *Categories* (${data.count} total)\n\n• ${cats}\n\n...and more!\n\nUse /category <name> to get facts`,
      parse_mode: "Markdown"
    })
    return c.json({ ok: true })
  }
  
  // /category command
  if (text.startsWith("/category ")) {
    const category = text.slice(10).trim().toLowerCase().replace(/ /g, "_")
    const data = await fetchFacts(`/facts/category/${encodeURIComponent(category)}`)
    
    if (data.error) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: `Category not found. Use /categories to see available categories.`
      })
    } else {
      const facts = data.data.slice(0, 3) as any[]
      await telegram("sendMessage", {
        chat_id: chatId,
        text: `📂 *${category.replace(/_/g, " ")}* (${data.count} facts)\n\nHere are 3 random ones:`
      })
      for (const fact of facts) {
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
  
  // /stats command
  if (text === "/stats") {
    const data = await fetchFacts("/stats")
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `📊 *Dataset Statistics*\n\n• Total facts: ${data.totalFacts.toLocaleString()}\n• Categories: ${data.categories}\n• Unique sources: ${data.uniqueSources}`,
      parse_mode: "Markdown"
    })
    return c.json({ ok: true })
  }
  
  // Unknown command - send a random fact
  if (text.startsWith("/")) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Unknown command. Use /start to see available commands."
    })
    return c.json({ ok: true })
  }
  
  // Regular message - send a random fact
  const data = await fetchFacts("/facts/random")
  await telegram("sendMessage", {
    chat_id: chatId,
    text: formatFact(data.data),
    parse_mode: "Markdown",
    disable_web_page_preview: true
  })
  
  return c.json({ ok: true })
})

export const POST = handle(app)
export default app
