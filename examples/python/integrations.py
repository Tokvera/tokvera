import asyncio
import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from tokvera import (
    create_fastapi_tracking_middleware,
    create_langchain_callback_handler,
    create_llamaindex_callback_handler,
    get_fastapi_track_kwargs,
    track_openai,
)


class FakeUsage:
    def __init__(self, prompt_tokens: int, completion_tokens: int, total_tokens: int):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens


class FakeResponse:
    def __init__(self, model: str, usage: FakeUsage):
        self.model = model
        self.usage = usage


class FakeCompletions:
    def create(self, model: str, messages):  # noqa: ANN001
        _ = messages
        return FakeResponse(model=model, usage=FakeUsage(13, 15, 28))


class FakeChat:
    def __init__(self):
        self.completions = FakeCompletions()


class FakeResponses:
    def create(self, model: str, input):  # noqa: A002, ANN001
        _ = input
        return FakeResponse(model=model, usage=FakeUsage(8, 9, 17))


class FakeOpenAI:
    def __init__(self):
        self.chat = FakeChat()
        self.responses = FakeResponses()


def load_local_env() -> None:
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def next_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


@dataclass
class FakeUrl:
    path: str


class FakeRequest:
    def __init__(self, headers: dict[str, str], method: str, path: str):
        self.headers = headers
        self.method = method
        self.url = FakeUrl(path=path)


class FakeResponseContainer:
    def __init__(self):
        self.headers: dict[str, str] = {}


async def run_fastapi_middleware_example(api_key: str, feature: str) -> dict[str, str]:
    middleware = create_fastapi_tracking_middleware(
        defaults={
            "feature": f"{feature}_fastapi",
            "tenant_id": "example_tenant",
            "environment": "example",
        },
        context_resolver=lambda _: {
            "customer_id": "example_customer",
            "quality_label": "good",
            "feedback_score": 4.5,
        },
    )
    request = FakeRequest(
        headers={
            "x-tokvera-trace-id": next_id("trc"),
            "x-tokvera-run-id": next_id("run"),
            "x-tokvera-conversation-id": next_id("conv"),
        },
        method="POST",
        path="/api/reply",
    )

    async def call_next(_request):
        track_kwargs = get_fastapi_track_kwargs(step_name="draft_reply")
        client = track_openai(
            FakeOpenAI(),
            api_key=api_key,
            **track_kwargs,
        )
        client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello from FastAPI middleware example"}],
        )
        return FakeResponseContainer()

    response = await middleware(request, call_next)
    return response.headers


class FakeLLMResult:
    def __init__(self, llm_output: dict):
        self.llm_output = llm_output


def run_langchain_callback_example(api_key: str, feature: str) -> None:
    callback = create_langchain_callback_handler(
        api_key=api_key,
        feature=f"{feature}_langchain",
        tenant_id="example_tenant",
        conversation_id=next_id("conv"),
        quality_label="good",
        feedback_score=5,
    )

    run_id = next_id("run")
    callback.on_llm_start(
        serialized={"kwargs": {"model": "gpt-4o-mini"}},
        prompts=["Summarize the account status"],
        run_id=run_id,
        metadata={"step_name": "summarize_status"},
    )
    callback.on_llm_end(
        FakeLLMResult(
            llm_output={
                "token_usage": {
                    "prompt_tokens": 11,
                    "completion_tokens": 8,
                    "total_tokens": 19,
                }
            }
        ),
        run_id=run_id,
    )


def run_llamaindex_callback_example(api_key: str, feature: str) -> None:
    callback = create_llamaindex_callback_handler(
        api_key=api_key,
        feature=f"{feature}_llamaindex",
        tenant_id="example_tenant",
        quality_label="good",
        feedback_score=4,
    )

    event_id = callback.on_event_start(
        event_type="LLM",
        payload={"model": "gpt-4o-mini"},
        event_id=next_id("evt"),
    )
    callback.on_event_end(
        event_type="LLM",
        payload={
            "prompt_tokens": 10,
            "completion_tokens": 12,
            "total_tokens": 22,
        },
        event_id=event_id,
    )


def main() -> None:
    load_local_env()

    api_key = os.getenv("TOKVERA_API_KEY")
    ingest_url = os.getenv("TOKVERA_INGEST_URL")
    feature = os.getenv("TOKVERA_FEATURE", "sdk_integrations_python")
    wait_seconds = float(os.getenv("TOKVERA_WAIT_SECONDS", "4"))

    if not api_key:
        raise RuntimeError("TOKVERA_API_KEY is required")
    if not ingest_url:
        raise RuntimeError("TOKVERA_INGEST_URL is required")

    fastapi_headers = asyncio.run(run_fastapi_middleware_example(api_key, feature))
    run_langchain_callback_example(api_key, feature)
    run_llamaindex_callback_example(api_key, feature)

    time.sleep(wait_seconds)
    print("python integrations example complete")
    print(
        {
            "feature": feature,
            "ingest_url": ingest_url,
            "middleware_trace_header": fastapi_headers.get("x-tokvera-trace-id"),
            "examples": [
                "fastapi_middleware",
                "langchain_callback",
                "llamaindex_callback",
            ],
        }
    )


if __name__ == "__main__":
    main()
