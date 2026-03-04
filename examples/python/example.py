import os
import time
import uuid
from pathlib import Path

from tokvera import track_openai


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
        return FakeResponse(model=model, usage=FakeUsage(20, 24, 44))


class FakeChat:
    def __init__(self):
        self.completions = FakeCompletions()


class FakeResponses:
    def create(self, model: str, input):  # noqa: A002, ANN001
        _ = input
        return FakeResponse(model=model, usage=FakeUsage(12, 17, 29))


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


def main() -> None:
    load_local_env()

    api_key = os.getenv("TOKVERA_API_KEY")
    ingest_url = os.getenv("TOKVERA_INGEST_URL")
    feature = os.getenv("TOKVERA_FEATURE", "sdk_example_python")
    wait_seconds = float(os.getenv("TOKVERA_WAIT_SECONDS", "4"))

    if not api_key:
        raise RuntimeError("TOKVERA_API_KEY is required")
    if not ingest_url:
        raise RuntimeError("TOKVERA_INGEST_URL is required")

    trace_id = next_id("trc")
    conversation_id = next_id("conv")
    root_span_id = next_id("spn")

    classify_client = track_openai(
        FakeOpenAI(),
        api_key=api_key,
        feature=feature,
        tenant_id="example_tenant",
        customer_id="example_customer",
        environment="example",
        trace_id=trace_id,
        conversation_id=conversation_id,
        span_id=root_span_id,
        step_name="classify_intent",
    )

    classify_client.responses.create(
        model="gpt-4o-mini",
        input="Classify this support request: user cannot access billing page.",
    )

    draft_span_id = next_id("spn")
    draft_client = track_openai(
        FakeOpenAI(),
        api_key=api_key,
        feature=feature,
        tenant_id="example_tenant",
        customer_id="example_customer",
        environment="example",
        trace_id=trace_id,
        conversation_id=conversation_id,
        span_id=draft_span_id,
        parent_span_id=root_span_id,
        step_name="draft_reply",
    )

    draft_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "I cannot access billing, can you help?"}],
    )

    time.sleep(wait_seconds)
    print("python example complete")
    print(
        {
            "feature": feature,
            "trace_id": trace_id,
            "conversation_id": conversation_id,
            "root_span_id": root_span_id,
            "draft_span_id": draft_span_id,
            "ingest_url": ingest_url,
        }
    )


if __name__ == "__main__":
    main()

