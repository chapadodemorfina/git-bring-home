#!/usr/bin/env python3
"""Run the reviewed log-maintenance SQL against the fixed legacy project."""
import argparse
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request

PROJECT_REF = "moijoyqwapimforpijdc"
API_ROOT = f"https://api.supabase.com/v1/projects/{PROJECT_REF}"
HERE = Path(__file__).resolve().parent


class MaintenanceError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise MaintenanceError("Unexpected redirect; operation stopped")


def api_request(token, path="", sql=None):
    """Never retry a request or expose upstream response bodies/credentials."""
    headers = {"Authorization": "Bearer " + token}
    payload = None
    if sql is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps({"query": sql}).encode("utf-8")
    request = urllib.request.Request(API_ROOT + path, data=payload, headers=headers)
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise MaintenanceError(f"Supabase HTTP {error.code}; no automatic retry") from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        raise MaintenanceError(
            "No reliable response. Do not repeat cleanup; inspect the database first."
        ) from None


def inspection_data(result):
    if not isinstance(result, list) or len(result) != 1:
        raise MaintenanceError("Unexpected inspection result; stop for review")
    data = result[0].get("inspection")
    if not isinstance(data, dict) or not isinstance(data.get("jobs"), list):
        raise MaintenanceError("Missing job inventory; stop for review")
    relations = data.get("relations", [])
    expected = {("cron", "job_run_details"), ("net", "_http_response")}
    found = {(r.get("schema_name"), r.get("table_name")) for r in relations}
    if len(relations) != 2 or found != expected or any(not r.get("relation_exists") for r in relations):
        raise MaintenanceError("Expected log tables were not confirmed")
    return data


def verify_after(before, after):
    retention_name = "daily-cleanup-internal-logs"
    old_jobs = {j["jobid"]: j for j in before["jobs"] if j["jobname"] != retention_name}
    new_jobs = {j["jobid"]: j for j in after["jobs"] if j["jobname"] != retention_name}
    if old_jobs != new_jobs:
        raise MaintenanceError("Job configuration changed; do not repeat cleanup")
    retention = [j for j in after["jobs"] if j["jobname"] == retention_name]
    if len(retention) != 1 or retention[0]["schedule"] != "0 6 * * *" or retention[0]["active"] is not True:
        raise MaintenanceError("Retention job was not confirmed; inspect before further operations")
    old_bytes = sum(r["total_bytes"] for r in before["relations"])
    new_bytes = sum(r["total_bytes"] for r in after["relations"])
    return {"existing_jobs_preserved": True, "log_bytes_before": old_bytes,
            "log_bytes_after": new_bytes, "observed_log_bytes_reclaimed": old_bytes - new_bytes}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("inspect", "apply"))
    parser.add_argument("--confirm-project")
    parser.add_argument("--dependencies-reviewed", action="store_true")
    args = parser.parse_args(argv)
    if args.mode == "apply" and (
        args.confirm_project != PROJECT_REF or not args.dependencies_reviewed
    ):
        raise MaintenanceError("Cleanup requires the exact project and dependency review")
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not token:
        raise MaintenanceError("SUPABASE_ACCESS_TOKEN is not configured")
    project = api_request(token)
    if not isinstance(project, dict) or project.get("id", project.get("ref")) != PROJECT_REF:
        raise MaintenanceError("Project identity mismatch; no SQL executed")
    inspect_sql = (HERE / "inspect_internal_logs.sql").read_text()
    before = api_request(token, "/database/query", inspect_sql)
    print(json.dumps({"phase": "before", "result": before}))
    before_data = inspection_data(before)
    if args.mode == "inspect":
        return 0
    cleanup_sql = (HERE / "cleanup_internal_logs.sql").read_text()
    cleanup = api_request(token, "/database/query", cleanup_sql)
    if not isinstance(cleanup, list) or len(cleanup) != 1 or not isinstance(cleanup[0].get("maintenance_result"), dict):
        raise MaintenanceError("Cleanup outcome was not confirmed; do not repeat, inspect first")
    print(json.dumps({"phase": "cleanup_request_completed"}))
    after = api_request(token, "/database/query", inspect_sql)
    print(json.dumps({"phase": "after", "result": after}))
    verified = verify_after(before_data, inspection_data(after))
    print(json.dumps({"phase": "verified", **verified}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except MaintenanceError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
