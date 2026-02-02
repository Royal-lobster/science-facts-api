import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSwagger
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema, Random, Array as Arr } from "effect"
import { createServer } from "node:http"
import factsData from "./data/facts.json" with { type: "json" }

// ============ Types & Data ============

interface RawFact {
  text: string
  category: string
  source_url?: string
  source_file?: string
}

// Add IDs to facts
const facts = (factsData as RawFact[]).map((f, i) => ({
  ...f,
  id: i + 1
}))

const categories = [...new Set(facts.map((f) => f.category))].sort()

// ============ Schemas ============

const FactSchema = Schema.Struct({
  id: Schema.Number,
  text: Schema.String,
  category: Schema.String,
  source_url: Schema.optional(Schema.String),
  source_file: Schema.optional(Schema.String)
})

const PaginationSchema = Schema.Struct({
  total: Schema.Number,
  limit: Schema.Number,
  offset: Schema.Number,
  hasMore: Schema.Boolean
})

const FactsResponseSchema = Schema.Struct({
  data: Schema.Array(FactSchema),
  pagination: PaginationSchema
})

const SingleFactResponseSchema = Schema.Struct({
  data: FactSchema
})

const RandomFactsResponseSchema = Schema.Struct({
  data: Schema.Union(FactSchema, Schema.Array(FactSchema))
})

const SearchResponseSchema = Schema.Struct({
  data: Schema.Array(FactSchema),
  count: Schema.Number,
  query: Schema.String
})

const CategoriesResponseSchema = Schema.Struct({
  data: Schema.Array(Schema.String),
  count: Schema.Number
})

const StatsResponseSchema = Schema.Struct({
  totalFacts: Schema.Number,
  categories: Schema.Number,
  uniqueSources: Schema.Number
})

const ApiInfoSchema = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  facts: Schema.Number,
  categories: Schema.Number
})

const ErrorSchema = Schema.Struct({
  error: Schema.String
})

// ============ API Definition ============

const FactsApi = HttpApi.make("FactsApi")
  .add(
    HttpApiGroup.make("Facts")
      // GET / - API info
      .add(
        HttpApiEndpoint.get("info")`/`.addSuccess(ApiInfoSchema)
      )
      // GET /facts - paginated facts
      .add(
        HttpApiEndpoint.get("list")`/facts`
          .addSuccess(FactsResponseSchema)
          .setUrlParams(Schema.Struct({
            limit: Schema.optional(Schema.NumberFromString),
            offset: Schema.optional(Schema.NumberFromString)
          }))
      )
      // GET /facts/random
      .add(
        HttpApiEndpoint.get("random")`/facts/random`
          .addSuccess(RandomFactsResponseSchema)
          .setUrlParams(Schema.Struct({
            count: Schema.optional(Schema.NumberFromString)
          }))
      )
      // GET /facts/search
      .add(
        HttpApiEndpoint.get("search")`/facts/search`
          .addSuccess(SearchResponseSchema)
          .addError(ErrorSchema, { status: 400 })
          .setUrlParams(Schema.Struct({
            q: Schema.optional(Schema.String)
          }))
      )
      // GET /facts/categories
      .add(
        HttpApiEndpoint.get("categories")`/facts/categories`
          .addSuccess(CategoriesResponseSchema)
      )
      // GET /facts/category/:name
      .add(
        HttpApiEndpoint.get("byCategory")`/facts/category/${HttpApiSchema.param("name", Schema.String)}`
          .addSuccess(SearchResponseSchema)
          .addError(ErrorSchema, { status: 404 })
      )
      // GET /facts/:id
      .add(
        HttpApiEndpoint.get("byId")`/facts/${HttpApiSchema.param("id", Schema.NumberFromString)}`
          .addSuccess(SingleFactResponseSchema)
          .addError(ErrorSchema, { status: 404 })
      )
      // GET /stats
      .add(
        HttpApiEndpoint.get("stats")`/stats`.addSuccess(StatsResponseSchema)
      )
  )

// ============ Implementation ============

const FactsLive = HttpApiBuilder.group(FactsApi, "Facts", (handlers) =>
  handlers
    .handle("info", () =>
      Effect.succeed({
        name: "Science Facts API",
        version: "1.0.0",
        facts: facts.length,
        categories: categories.length
      })
    )
    .handle("list", ({ urlParams }) =>
      Effect.sync(() => {
        const limit = Math.min(urlParams.limit ?? 100, 1000)
        const offset = urlParams.offset ?? 0
        const paginated = facts.slice(offset, offset + limit)
        return {
          data: paginated,
          pagination: {
            total: facts.length,
            limit,
            offset,
            hasMore: offset + limit < facts.length
          }
        }
      })
    )
    .handle("random", ({ urlParams }) =>
      Effect.gen(function* () {
        const count = Math.min(urlParams.count ?? 1, 100)
        const result: typeof facts = []
        const indices = new Set<number>()

        while (result.length < count && result.length < facts.length) {
          const idx = yield* Random.nextIntBetween(0, facts.length)
          if (!indices.has(idx)) {
            indices.add(idx)
            result.push(facts[idx])
          }
        }

        return { data: count === 1 ? result[0] : result }
      })
    )
    .handle("search", ({ urlParams }) =>
      Effect.gen(function* () {
        const query = urlParams.q
        if (!query) {
          return yield* Effect.fail({ error: "Missing 'q' parameter" })
        }
        const q = query.toLowerCase()
        const results = facts.filter((f) => f.text.toLowerCase().includes(q))
        return { data: results, count: results.length, query }
      })
    )
    .handle("categories", () =>
      Effect.succeed({ data: categories, count: categories.length })
    )
    .handle("byCategory", ({ path }) =>
      Effect.gen(function* () {
        const category = path.name.toLowerCase()
        const matched = facts.filter((f) => f.category.toLowerCase() === category)
        if (matched.length === 0) {
          return yield* Effect.fail({ error: `Category '${path.name}' not found` })
        }
        return { data: matched, count: matched.length, query: path.name }
      })
    )
    .handle("byId", ({ path }) =>
      Effect.gen(function* () {
        const fact = facts.find((f) => f.id === path.id)
        if (!fact) {
          return yield* Effect.fail({ error: `Fact ${path.id} not found` })
        }
        return { data: fact }
      })
    )
    .handle("stats", () =>
      Effect.succeed({
        totalFacts: facts.length,
        categories: categories.length,
        uniqueSources: 13
      })
    )
)

// ============ Server ============

const ApiLive = HttpApiBuilder.api(FactsApi).pipe(Layer.provide(FactsLive))

const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiSwagger.layer()),
  Layer.provide(ApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

console.log("🔬 Science Facts API (Effect TS) running on http://localhost:3000")
console.log("📚 Swagger docs at http://localhost:3000/docs")

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
