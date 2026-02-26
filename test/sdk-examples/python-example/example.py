import time

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


def main() -> None:
    client = track_openai(
        FakeOpenAI(),
        api_key="tokvera_project_key",
        feature="sdk_smoke_python",
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

    # Python SDK ingestion is async on daemon thread.
    time.sleep(1.2)
    print("python example complete")


if __name__ == "__main__":
    main()
