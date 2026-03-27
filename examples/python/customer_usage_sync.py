import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


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


def build_window(days: int) -> dict[str, str]:
    to = datetime.now(timezone.utc)
    from_ = to - timedelta(days=days)
    return {
        "from": from_.isoformat().replace("+00:00", "Z"),
        "to": to.isoformat().replace("+00:00", "Z"),
    }


def request_json(*, base_url: str, session_token: str, tenant_id: str, path: str) -> dict:
    request = Request(
        f"{base_url}{path}",
        headers={
            "authorization": f"Bearer {session_token}",
            "x-tenant-id": tenant_id,
        },
    )
    with urlopen(request) as response:  # noqa: S310
        return json.loads(response.read().decode("utf-8"))


def to_ledger_snapshot(customer: dict) -> dict:
    return {
        "customer_id": customer["customer_id"],
        "billable_units": customer["total_tokens"],
        "estimated_cost_usd": customer["total_cost_usd"],
        "request_count": customer["request_count"],
        "project_count": customer["project_count"],
        "sync_note": "Map billable_units to your own credit formula before persisting.",
    }


def to_webhook_ledger_event(payload: dict) -> dict:
    return {
        "customer_id": payload["customer_id"],
        "event_type": payload["event_type"],
        "billable_units": payload["overview"]["total_tokens"],
        "estimated_cost_usd": payload["overview"]["total_cost_usd"],
        "credit_bucket": payload.get("credit_bucket"),
        "remaining_credits": payload.get("remaining_credits"),
        "threshold": payload.get("threshold"),
    }


def main() -> None:
    load_local_env()

    base_url = os.getenv("TOKVERA_API_BASE_URL")
    session_token = os.getenv("TOKVERA_SESSION_TOKEN")
    tenant_id = os.getenv("TOKVERA_TENANT_ID")
    project_id = os.getenv("TOKVERA_PROJECT_ID", "")
    preferred_customer_id = os.getenv("TOKVERA_CUSTOMER_ID", "")
    days = max(1, int(os.getenv("TOKVERA_CUSTOMER_USAGE_DAYS", "30")))

    if not base_url:
        raise RuntimeError("TOKVERA_API_BASE_URL is required")
    if not session_token:
        raise RuntimeError("TOKVERA_SESSION_TOKEN is required")
    if not tenant_id:
        raise RuntimeError("TOKVERA_TENANT_ID is required")

    window = build_window(days)
    query = {"from": window["from"], "to": window["to"]}
    if project_id:
        query["project_id"] = project_id

    list_payload = request_json(
        base_url=base_url,
        session_token=session_token,
        tenant_id=tenant_id,
        path=f"/v1/usage/customers?{urlencode(query)}",
    )

    selected_customer = next(
        (item for item in list_payload["items"] if item["customer_id"] == preferred_customer_id),
        list_payload["items"][0] if list_payload["items"] else None,
    )

    if not selected_customer:
        print("No customer-attributed usage found in this window.")
        return

    detail_payload = request_json(
        base_url=base_url,
        session_token=session_token,
        tenant_id=tenant_id,
        path=f"/v1/usage/customers/{quote(selected_customer['customer_id'], safe='')}?{urlencode(query)}",
    )

    webhook_payload = {
        "schema_version": "customer_usage.v1",
        "event_type": "customer.usage.updated",
        "customer_id": selected_customer["customer_id"],
        "credit_bucket": (
            detail_payload["by_credit_bucket"][0]["group"] if detail_payload["by_credit_bucket"] else None
        ),
        "remaining_credits": None,
        "threshold": None,
        "overview": detail_payload["overview"],
    }

    print("customer usage sync example complete")
    print(
        json.dumps(
            {
                "window": window,
                "selected_customer": selected_customer["customer_id"],
                "ledger_snapshot": to_ledger_snapshot(selected_customer),
                "webhook_projection": to_webhook_ledger_event(webhook_payload),
                "next_step": (
                    "Persist ledger_snapshot in your own billing store and validate webhook_projection "
                    "against your webhook handler before enabling automated customer_usage webhooks."
                ),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
