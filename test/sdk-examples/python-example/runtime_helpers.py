import os
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    from tokvera import (
        TokveraOTelSpanExporter,
        configure_claude_agent_sdk,
        configure_google_adk,
        create_crewai_tracer,
        create_instructor_tracer,
        create_langgraph_tracer,
    create_pydanticai_tracer,
    create_tracer,
    finish_span,
    get_track_kwargs_from_trace_context,
    start_span,
    start_trace,
    track_mistral,
    )
except ImportError as exc:  # pragma: no cover - explicit operator guidance
    raise RuntimeError(
        "runtime_helpers.py requires tokvera with runtime-helper support (0.2.8+) "
        "or a local ../tokvera-python checkout on PYTHONPATH."
    ) from exc


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
class FakeMistralUsage:
    prompt_tokens: int = 11
    completion_tokens: int = 9
    total_tokens: int = 20


@dataclass
class FakeMistralResponse:
    model: str = "mistral-small-latest"
    usage: FakeMistralUsage = field(default_factory=FakeMistralUsage)
    choices: list[dict[str, Any]] = field(
        default_factory=lambda: [{"message": {"content": "Drafted a concise answer."}}]
    )


class FakeMistralChat:
    def complete(self, *args: Any, **kwargs: Any) -> FakeMistralResponse:
        _ = args, kwargs
        return FakeMistralResponse()


class FakeMistralClient:
    def __init__(self) -> None:
        self.chat = FakeMistralChat()


def run_existing_app(base_options: dict[str, Any], feature: str) -> None:
    tracer = create_tracer(
        **base_options,
        feature=feature,
        emit_lifecycle_events=True,
        capture_content=True,
    )
    root = start_trace(
        tracer,
        step_name="existing_app_router",
        model="custom-router",
        span_kind="orchestrator",
        quality_label="good",
        feedback_score=4.9,
        outcome="success",
    )
    policy = start_span(
        root,
        step_name="route_policy",
        provider="tokvera",
        model="policy-engine",
        span_kind="guardrail",
        routing_reason="default_policy",
        route="anthropic:claude-3.5-haiku",
        quality_label="good",
    )
    finish_span(
        policy,
        response={"selected_route": "anthropic:claude-3.5-haiku"},
        quality_label="good",
        outcome="success",
    )
    finish_span(
        root,
        response={"completed": True},
        quality_label="good",
        feedback_score=5,
        outcome="success",
    )


def run_mistral(base_options: dict[str, Any], feature: str) -> None:
    tracer = create_tracer(
        **base_options,
        feature=feature,
        emit_lifecycle_events=True,
        capture_content=True,
    )
    root = start_trace(
        tracer,
        step_name="mistral_support_flow",
        model="mistral-router",
        span_kind="orchestrator",
        quality_label="poor",
        feedback_score=2.2,
        outcome="success",
    )
    client = track_mistral(
        FakeMistralClient(),
        **get_track_kwargs_from_trace_context(
            root,
            step_name="mistral_reply",
            span_kind="model",
            provider="mistral",
            model="mistral-small-latest",
            quality_label="poor",
            feedback_score=2.1,
            outcome="success",
            emit_lifecycle_events=True,
            capture_content=True,
        ),
    )
    response = client.chat.complete(
        model="mistral-small-latest",
        messages=[{"role": "user", "content": "Draft a short refund policy answer."}],
    )
    finish_span(
        root,
        response={"completed": True, "provider_response": response.choices[0]["message"]["content"]},
        quality_label="poor",
        feedback_score=2.2,
        outcome="success",
    )


def run_claude_agent(base_options: dict[str, Any], feature: str) -> None:
    tracer = configure_claude_agent_sdk(
        **base_options,
        feature=feature,
        emit_lifecycle_events=True,
        capture_content=True,
    )
    run = tracer.start_agent(
        step_name="claude_support_agent",
        model="claude-agent-router",
        quality_label="good",
        feedback_score=4.6,
        outcome="success",
    )
    tool = tracer.start_tool(run, step_name="crm_lookup", tool_name="crm_lookup")
    tracer.finish_tool(tool, response={"customer_tier": "priority"}, quality_label="good", outcome="success")
    model = tracer.start_model(
        run,
        step_name="draft_reply",
        provider="anthropic",
        model="claude-3.5-haiku",
        quality_label="good",
        feedback_score=4.8,
        outcome="success",
    )
    tracer.finish_model(
        model,
        response={"output_text": "Priority customers are eligible for faster review."},
        usage={"prompt_tokens": 12, "completion_tokens": 10, "total_tokens": 22},
        quality_label="good",
        feedback_score=4.9,
        outcome="success",
    )
    tracer.finish_run(run, response={"status": "completed"}, quality_label="good", feedback_score=5, outcome="success")


def run_google_adk(base_options: dict[str, Any], feature: str) -> None:
    tracer = configure_google_adk(
        **base_options,
        feature=feature,
        emit_lifecycle_events=True,
        capture_content=True,
    )
    run = tracer.start_agent(
        step_name="google_adk_agent",
        model="adk-router",
        quality_label="good",
        feedback_score=4.5,
        outcome="success",
    )
    model = tracer.start_model(
        run,
        step_name="grounded_answer",
        provider="gemini",
        model="gemini-2.0-flash",
        quality_label="good",
        feedback_score=4.7,
        outcome="success",
    )
    tracer.finish_model(
        model,
        response={"output_text": "The account is now verified and ready for refund review."},
        usage={"prompt_tokens": 10, "completion_tokens": 9, "total_tokens": 19},
        quality_label="good",
        feedback_score=4.8,
        outcome="success",
    )
    tracer.finish_run(run, response={"status": "completed"}, quality_label="good", feedback_score=4.8, outcome="success")


def run_langgraph(base_options: dict[str, Any], feature: str) -> None:
    tracer = create_langgraph_tracer(
        **base_options,
        feature=feature,
        emit_lifecycle_events=True,
        capture_content=True,
    )
    graph = tracer.start_graph(
        step_name="langgraph_support_flow",
        model="planner-graph",
        quality_label="good",
        feedback_score=4.4,
        outcome="success",
    )
    planner = tracer.start_node(graph, step_name="planner")
    tracer.finish_node(planner, response={"next": "kb_lookup"}, quality_label="good", outcome="success")
    branch = tracer.start_branch(graph, step_name="confidence_gate", routing_reason="confidence_below_threshold", route="fallback_path")
    tracer.finish_branch(
        branch,
        response={"selected_branch": "fallback_path"},
        quality_label="good",
        feedback_score=4.6,
        outcome="success",
    )
    tracer.finish_run(graph, response={"status": "completed"}, quality_label="good", feedback_score=4.7, outcome="success")


def run_instructor(base_options: dict[str, Any], feature: str) -> None:
    tracer = create_instructor_tracer(
        **base_options,
        feature=feature,
        emit_lifecycle_events=True,
        capture_content=True,
    )
    extraction = tracer.start_extraction(
        step_name="invoice_extract",
        model="instructor-router",
        quality_label="good",
        feedback_score=4.3,
        outcome="success",
    )
    validation = tracer.start_validation(
        extraction,
        step_name="validation_retry",
        retry_reason="schema_mismatch",
    )
    tracer.finish_branch(
        validation,
        response={"schema_valid": True},
        quality_label="good",
        feedback_score=4.5,
        outcome="success",
    )
    tracer.finish_run(extraction, response={"status": "completed"}, quality_label="good", feedback_score=4.6, outcome="success")


def run_pydanticai(base_options: dict[str, Any], feature: str) -> None:
    tracer = create_pydanticai_tracer(
        **base_options,
        feature=feature,
        emit_lifecycle_events=True,
        capture_content=True,
    )
    run = tracer.start_agent(
        step_name="pydanticai_run",
        model="validation-agent",
        quality_label="good",
        feedback_score=4.4,
        outcome="success",
    )
    validation = tracer.start_validation(
        run,
        step_name="pydantic_validation",
        retry_reason="model_parse_retry",
    )
    tracer.finish_branch(
        validation,
        response={"validated": True},
        quality_label="good",
        feedback_score=4.5,
        outcome="success",
    )
    tracer.finish_run(run, response={"status": "completed"}, quality_label="good", feedback_score=4.6, outcome="success")


def run_crewai(base_options: dict[str, Any], feature: str) -> None:
    tracer = create_crewai_tracer(
        **base_options,
        feature=feature,
        emit_lifecycle_events=True,
        capture_content=True,
    )
    crew = tracer.start_crew(
        step_name="crew_support_workflow",
        model="crew-router",
        quality_label="good",
        feedback_score=4.2,
        outcome="success",
    )
    tool = tracer.start_tool(crew, step_name="kb_search", tool_name="kb_search")
    tracer.finish_tool(tool, response={"match_count": 3}, quality_label="good", outcome="success")
    tracer.finish_run(crew, response={"status": "completed"}, quality_label="good", feedback_score=4.4, outcome="success")


def run_otel(base_options: dict[str, Any], feature: str) -> None:
    exporter = TokveraOTelSpanExporter(
        **base_options,
        feature=feature,
    )

    class _Status:
        is_ok = True

    class _Context:
        trace_id = next_id("trc")
        span_id = next_id("spn")

    class _Span:
        name = "retrieval_plan"
        start_time = 100.0
        end_time = 100.18
        parent_span_id = None
        attributes = {
            "tokvera.provider": "openai",
            "tokvera.feature": feature,
            "tokvera.step_name": "retrieval_plan",
            "tokvera.endpoint": "responses.create",
            "tokvera.cost_usd": 0.00002,
            "gen_ai.response.model": "gpt-4o-mini",
            "gen_ai.usage.input_tokens": 8,
            "gen_ai.usage.output_tokens": 5,
        }
        resource = type("Resource", (), {"attributes": {"service.name": "vector-router", "deployment.environment": "test"}})()
        status = _Status()

        def get_span_context(self):
            return _Context()

    exporter.export([_Span()])


def main() -> None:
    load_local_env()

    api_key = os.getenv("TOKVERA_API_KEY")
    if not api_key:
        raise RuntimeError("TOKVERA_API_KEY is required")

    base_options = {
        "api_key": api_key,
        "tenant_id": "example_tenant",
        "customer_id": "example_customer",
        "environment": "test",
        "schema_version": "2026-04-01",
    }

    features = {
        "existing_app": os.getenv("TOKVERA_FEATURE_EXISTING_APP_PY", "runtime_existing_app_py"),
        "mistral": os.getenv("TOKVERA_FEATURE_MISTRAL_PY", "runtime_mistral_py"),
        "claude_agent": os.getenv("TOKVERA_FEATURE_CLAUDE_AGENT_PY", "runtime_claude_agent_py"),
        "google_adk": os.getenv("TOKVERA_FEATURE_GOOGLE_ADK_PY", "runtime_google_adk_py"),
        "langgraph": os.getenv("TOKVERA_FEATURE_LANGGRAPH_PY", "runtime_langgraph_py"),
        "instructor": os.getenv("TOKVERA_FEATURE_INSTRUCTOR_PY", "runtime_instructor_py"),
        "pydanticai": os.getenv("TOKVERA_FEATURE_PYDANTICAI_PY", "runtime_pydanticai_py"),
        "crewai": os.getenv("TOKVERA_FEATURE_CREWAI_PY", "runtime_crewai_py"),
        "otel": os.getenv("TOKVERA_FEATURE_OTEL_PY", "runtime_otel_py"),
    }

    run_existing_app(base_options, features["existing_app"])
    run_mistral(base_options, features["mistral"])
    run_claude_agent(base_options, features["claude_agent"])
    run_google_adk(base_options, features["google_adk"])
    run_langgraph(base_options, features["langgraph"])
    run_instructor(base_options, features["instructor"])
    run_pydanticai(base_options, features["pydanticai"])
    run_crewai(base_options, features["crewai"])
    run_otel(base_options, features["otel"])

    time.sleep(float(os.getenv("TOKVERA_WAIT_SECONDS", "4.0")))
    print("python runtime helper smoke complete")
    print(features)


if __name__ == "__main__":
    main()
