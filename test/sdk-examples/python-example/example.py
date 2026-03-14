import inspect
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
        return FakeResponse(model=model, usage=FakeUsage(14, 19, 33))


class FakeChat:
    def __init__(self):
        self.completions = FakeCompletions()


class FakeResponses:
    def create(self, model: str, input):  # noqa: A002, ANN001
        _ = input
        return FakeResponse(model=model, usage=FakeUsage(9, 11, 20))


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
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def next_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def track_openai_compat(client, **kwargs):
    supported = set(inspect.signature(track_openai).parameters.keys())
    filtered = {key: value for key, value in kwargs.items() if key in supported}
    return track_openai(client, **filtered)


def main() -> None:
    load_local_env()

    api_key = os.getenv("TOKVERA_API_KEY")
    ingest_url = os.getenv("TOKVERA_INGEST_URL")
    feature = os.getenv("TOKVERA_FEATURE", "sdk_smoke_python")
    wait_seconds = float(os.getenv("TOKVERA_WAIT_SECONDS", "4.0"))
    trace_id = next_id("trc")
    run_id = next_id("run")
    conversation_id = next_id("conv")
    root_span_id = next_id("spn")
    reply_span_id = next_id("spn")

    if not api_key:
        raise RuntimeError("TOKVERA_API_KEY is required")
    if not ingest_url:
        raise RuntimeError("TOKVERA_INGEST_URL is required")

    planner_client = track_openai_compat(
        FakeOpenAI(),
        api_key=api_key,
        feature=feature,
        tenant_id="example_tenant",
        customer_id="example_customer",
        environment="test",
        schema_version="2026-04-01",
        trace_id=trace_id,
        run_id=run_id,
        conversation_id=conversation_id,
        span_id=root_span_id,
        step_name="plan_response",
        span_kind="orchestrator",
        capture_content=True,
        emit_lifecycle_events=True,
        payload_blocks=[
            {
                "payload_type": "context",
                "content": "Policy snapshot: refund for invoice mismatch allowed within 7 days after verification.",
            }
        ],
        metrics={"cost_usd": 0.00008},
        decision={
            "outcome": "success",
            "routing_reason": "default_policy",
            "route": "openai:gpt-4o-mini",
        },
        outcome="success",
        quality_label="good",
        feedback_score=4.6,
    )

    planner_client.responses.create(
        model="gpt-4o-mini",
        input="Plan a support answer for an invoice mismatch request. Keep response short and safe.",
    )

    reply_client = track_openai_compat(
        FakeOpenAI(),
        api_key=api_key,
        feature=feature,
        tenant_id="example_tenant",
        customer_id="example_customer",
        environment="test",
        schema_version="2026-04-01",
        trace_id=trace_id,
        run_id=run_id,
        conversation_id=conversation_id,
        span_id=reply_span_id,
        parent_span_id=root_span_id,
        step_name="draft_response",
        span_kind="model",
        capture_content=True,
        emit_lifecycle_events=True,
        payload_blocks=[
            {
                "payload_type": "context",
                "content": "Customer tier: pro. Account state: verified. Ticket priority: normal.",
            }
        ],
        metrics={"cost_usd": 0.00011},
        decision={"outcome": "success", "retry_reason": "none"},
        outcome="success",
        quality_label="good",
        feedback_score=4.8,
    )

    reply_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "hello from python trace v2 example"}],
    )

    # Python SDK ingestion runs on daemon thread. Wait before process exit.
    time.sleep(wait_seconds)
    print(
        f"python example complete (feature={feature}, ingest={ingest_url}, trace_id={trace_id}, live=/dashboard/traces/live)"
    )


if __name__ == "__main__":
    main()
