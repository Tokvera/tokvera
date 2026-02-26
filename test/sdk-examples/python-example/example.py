import os
import time
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


def main() -> None:
    load_local_env()

    api_key = os.getenv("TOKVERA_API_KEY")
    ingest_url = os.getenv("TOKVERA_INGEST_URL")
    feature = os.getenv("TOKVERA_FEATURE", "sdk_smoke_python")
    wait_seconds = float(os.getenv("TOKVERA_WAIT_SECONDS", "4.0"))

    if not api_key:
        raise RuntimeError("TOKVERA_API_KEY is required")
    if not ingest_url:
        raise RuntimeError("TOKVERA_INGEST_URL is required")

    client = track_openai(
        FakeOpenAI(),
        api_key=api_key,
        feature=feature,
        tenant_id="example_tenant",
        customer_id="example_customer",
        environment="test",
    )

    client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "hello from python"}],
    )
    client.responses.create(
        model="gpt-4o-mini",
        input="hello from python responses",
    )

    # Python SDK ingestion runs on daemon thread. Wait before process exit.
    time.sleep(wait_seconds)
    print(f"python example complete (feature={feature}, ingest={ingest_url})")


if __name__ == "__main__":
    main()
