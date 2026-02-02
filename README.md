# 🔬 Science Facts API

REST API serving 10,000+ verified science facts. Built with [Hono](https://hono.dev).

[![Dataset](https://img.shields.io/badge/🤗%20Dataset-HuggingFace-yellow)](https://huggingface.co/datasets/Royal-lobster/100001-Science-Facts)
[![Facts](https://img.shields.io/badge/Facts-10%2C003-blue)]()
[![Live](https://img.shields.io/badge/Live-Vercel-black)](https://science-facts-api.vercel.app)

## 🚀 Live API

**Base URL:** `https://science-facts-api.vercel.app`

## 📚 Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info |
| `GET /facts` | Get all facts (paginated) |
| `GET /facts/random` | Get random fact(s) |
| `GET /facts/search?q=` | Search facts |
| `GET /facts/categories` | List all categories |
| `GET /facts/category/:name` | Get facts by category |
| `GET /facts/:id` | Get fact by ID |
| `GET /stats` | Dataset statistics |

## 🎯 Examples

```bash
# Get a random fact
curl https://science-facts-api.vercel.app/facts/random

# Get 5 random facts
curl https://science-facts-api.vercel.app/facts/random?count=5

# Search for facts about "quantum"
curl https://science-facts-api.vercel.app/facts/search?q=quantum

# Get facts about Physics
curl https://science-facts-api.vercel.app/facts/category/physics

# Paginate through all facts
curl https://science-facts-api.vercel.app/facts?limit=50&offset=100
```

## 🛠 Tech Stack

- **[Hono](https://hono.dev)** - Ultrafast web framework
- **[Vercel](https://vercel.com)** - Serverless deployment
- **TypeScript** - Type safety

## 📊 Data Sources

| Source | Facts |
|--------|-------|
| Wikipedia | 6,096 |
| Wikidata | 627 |
| Mental Floss | 124 |
| PubMed Central | 43 |
| Science Daily | 30 |
| Science Alert | 25 |
| Live Science | 21 |
| National Geographic | 13 |
| Nature | 9 |
| Space.com | 4 |
| Others | 3 |

## 🏃 Local Development

```bash
npm install
npm run dev
```

## 📦 Related

- [Dataset on HuggingFace](https://huggingface.co/datasets/Royal-lobster/100001-Science-Facts)
- [Source Data Repo](https://github.com/Royal-lobster/science-facts-project)

## 📄 License

MIT
