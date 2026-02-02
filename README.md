# 🔬 Science Facts API

REST API serving 10,000+ verified science facts. Built with [Effect-TS](https://effect.website).

[![Dataset](https://img.shields.io/badge/🤗%20Dataset-HuggingFace-yellow)](https://huggingface.co/datasets/Royal-lobster/100001-Science-Facts)
[![Facts](https://img.shields.io/badge/Facts-10%2C003-blue)]()

## 🚀 Live API

**Base URL:** `https://science-facts-api.vercel.app`

## 📚 Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api` | API info |
| `GET /api/facts` | Get all facts (paginated) |
| `GET /api/facts/random` | Get random fact(s) |
| `GET /api/facts/search?q=` | Search facts |
| `GET /api/facts/categories` | List all categories |
| `GET /api/facts/category/:name` | Get facts by category |
| `GET /api/facts/:id` | Get fact by ID |
| `GET /api/stats` | Dataset statistics |

## 🎯 Examples

```bash
# Get a random fact
curl https://science-facts-api.vercel.app/api/facts/random

# Get 5 random facts
curl https://science-facts-api.vercel.app/api/facts/random?count=5

# Search for facts about "quantum"
curl https://science-facts-api.vercel.app/api/facts/search?q=quantum

# Get facts about Physics
curl https://science-facts-api.vercel.app/api/facts/category/Physics

# Paginate through all facts
curl https://science-facts-api.vercel.app/api/facts?limit=50&offset=100
```

## 🛠 Tech Stack

- **[Hono](https://hono.dev)** - Lightweight, ultrafast web framework
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
# Install dependencies
npm install

# Run development server
npm run dev

# Build
npm run build
```

## 📦 Related

- [Dataset on HuggingFace](https://huggingface.co/datasets/Royal-lobster/100001-Science-Facts)
- [Source Data Repo](https://github.com/Royal-lobster/science-facts-project)

## 📄 License

MIT
