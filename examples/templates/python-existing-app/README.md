# Python Existing-App Starter

This starter is for custom Python services that want a manual root trace plus a tracked provider call.

## Run

```bash
cp .env.example .env
pip install -r requirements.txt
python app.py
```

## What It Does

- creates a manual root trace
- opens a child model span
- wraps one OpenAI-shaped call with Tokvera
- emits lifecycle events so the run shows up in `/dashboard/traces/live`

## Replace Next

- `FakeOpenAI()` with your real provider client
- `starter_tenant` and `starter_customer` with real identifiers
- the `feature` name with a real product feature

## Verify

Follow `../checklists/verify-in-live-traces.md`
