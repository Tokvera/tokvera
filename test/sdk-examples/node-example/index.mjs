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
  const tracked = trackOpenAI(fakeOpenAI, {
    api_key: process.env.TOKVERA_API_KEY,
    ingest_url: process.env.TOKVERA_INGEST_URL,
    feature: "sdk_smoke_node",
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
  await new Promise((resolve) => setTimeout(resolve, 1200));
  console.log("node example complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
