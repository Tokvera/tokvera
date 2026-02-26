import { trackOpenAI } from "@tokvera/sdk";

const fakeOpenAI = {
  chat: {
    completions: {
      async create(payload) {
        return {
          id: "chat_1",
          model: payload.model || "gpt-4o-mini",
          usage: {
            prompt_tokens: 12,
            completion_tokens: 18,
            total_tokens: 30,
          },
        };
      },
    },
  },
  responses: {
    async create(payload) {
      return {
        id: "resp_1",
        model: payload.model || "gpt-4o-mini",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      };
    },
  },
};

async function main() {
  const feature = process.env.TOKVERA_FEATURE || "sdk_smoke_node";
  const waitMs = Number(process.env.TOKVERA_WAIT_MS || 1200);

  const tracked = trackOpenAI(fakeOpenAI, {
    api_key: process.env.TOKVERA_API_KEY,
    ingest_url: process.env.TOKVERA_INGEST_URL,
    feature,
    tenant_id: "example_tenant",
    customer_id: "example_customer",
    environment: "test",
  });

  await tracked.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "hello from node" }],
  });

  await tracked.responses.create({
    model: "gpt-4o-mini",
    input: "hello from node responses",
  });

  // SDK sends ingestion in fire-and-forget mode.
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  console.log(`node example complete (feature=${feature}, ingest=${process.env.TOKVERA_INGEST_URL})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
