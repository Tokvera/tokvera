import inspect
import os
import time
import uuid
from pathlib import Path

from tokvera import create_tracer, finish_span, get_track_kwargs_from_trace_context, start_span, start_trace, track_openai


class FakeUsage:
    def __init__(self, prompt_tokens: int, completion_tokens: int, total_tokens: int):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens


class FakeResponse:
    def __init__(self, model: str):
        self.model = model
        self.usage = FakeUsage(15, 19, 34)


class FakeResponses:
    def create(self, model: str, input):  # noqa: A002, ANN001
        _ = input
        return FakeResponse(model=model)


class FakeOpenAI:
    def __init__(self):
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


def track_openai_compat(client, **kwargs):
    supported = set(inspect.signature(track_openai).parameters.keys())
    filtered = {key: value for key, value in kwargs.items() if key in supported}
    return track_openai(client, **filtered)


def next_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def main() -> None:
    load_local_env()

    api_key = os.getenv("TOKVERA_API_KEY")
    ingest_url = os.getenv("TOKVERA_INGEST_URL")
    feature = os.getenv("TOKVERA_FEATURE", "python_existing_app_template")
    wait_seconds = float(os.getenv("TOKVERA_WAIT_SECONDS", "1.2"))

    if not api_key:
        raise RuntimeError("TOKVERA_API_KEY is required")
    if not ingest_url:
        raise RuntimeError("TOKVERA_INGEST_URL is required")

    tracer = create_tracer(
        api_key=api_key,
        ingest_url=ingest_url,
        feature=feature,
        tenant_id="starter_tenant",
        customer_id="starter_customer",
        environment="starter",
        emit_lifecycle_events=True,
    )

    root = start_trace(tracer, step_name="handle_request", model="existing-app-template", span_kind="orchestrator")
    classify = start_span(root, step_name="classify_ticket", provider="openai", model="gpt-4o-mini", span_kind="model")

    client = track_openai_compat(
        FakeOpenAI(),
        **get_track_kwargs_from_trace_context(
            classify,
            step_name="classify_ticket",
            span_kind="model",
            capture_content=True,
        ),
    )

    response = client.responses.create(
        model="gpt-4o-mini",
        input="Classify this ticket: customer cannot update billing card.",
    )

    finish_span(classify, response=response, model="gpt-4o-mini")
    finish_span(root, response={"route": "billing_support"})

    time.sleep(wait_seconds)
    print("python existing-app starter complete")
    print(
        {
            "feature": feature,
            "trace_id": getattr(root, "trace_id", next_id("trc")),
            "run_id": getattr(root, "run_id", next_id("run")),
            "live_traces": "/dashboard/traces/live",
        }
    )


if __name__ == "__main__":
    main()
