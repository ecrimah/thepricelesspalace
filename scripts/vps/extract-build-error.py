#!/usr/bin/env python3
import json, sys, urllib.request

token = open("/data/fleet/secrets/coolify-api.token").read().strip()
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/deployments/vhnj75v31v107jn6gt1ekm0m",
    headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(req) as resp:
    data = json.load(resp)
logs = data.get("logs")
if isinstance(logs, str):
    logs = json.loads(logs)
text = "\n".join((r.get("output") or "") for r in logs)
# Prefer TypeScript / Next build failures
for marker in ["Failed to compile", "Type error:", "error TS", "Module not found", "npm ERR", "Error:"]:
    i = text.rfind(marker)
    if i >= 0:
        print(text[max(0, i - 500) : i + 3500])
        sys.exit(0)
print(text[-5000:])
