import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch
import urllib.error

spec = importlib.util.spec_from_file_location("maintenance", Path(__file__).with_name("run.py"))
maintenance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(maintenance)


class MaintenanceSafetyTests(unittest.TestCase):
    def snapshot(self):
        return {"jobs": [{"jobid": 1, "jobname": "notifications", "schedule": "* * * * *", "command_fingerprint": "unchanged"}],
                "relations": [{"schema_name": "cron", "table_name": "job_run_details", "relation_exists": True, "total_bytes": 1024},
                              {"schema_name": "net", "table_name": "_http_response", "relation_exists": True, "total_bytes": 1024}]}

    def test_apply_rejects_wrong_project_before_network(self):
        with patch.object(maintenance, "api_request") as request:
            with self.assertRaises(maintenance.MaintenanceError):
                maintenance.main(["apply", "--confirm-project", "different"])
            request.assert_not_called()

    def test_apply_accepts_exact_project_without_dependency_review(self):
        after = self.snapshot()
        after["jobs"].append({"jobid": 2, "jobname": "daily-cleanup-internal-logs",
                              "schedule": "0 6 * * *", "active": True})
        with patch.dict(os.environ, {"SUPABASE_ACCESS_TOKEN": "test-only"}), patch.object(
            maintenance, "api_request", side_effect=[
                {"id": maintenance.PROJECT_REF}, [{"inspection": self.snapshot()}],
                [{"maintenance_result": {}}], [{"inspection": after}]
            ]
        ) as request, patch("builtins.print"):
            self.assertEqual(maintenance.main([
                "apply", "--confirm-project", maintenance.PROJECT_REF
            ]), 0)
            self.assertEqual(request.call_count, 4)

    def test_missing_credential_stops_before_network(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(maintenance, "api_request") as request:
            with self.assertRaises(maintenance.MaintenanceError):
                maintenance.main(["inspect"])
            request.assert_not_called()

    def test_project_mismatch_stops_before_sql(self):
        with patch.dict(os.environ, {"SUPABASE_ACCESS_TOKEN": "test-only"}), patch.object(
            maintenance, "api_request", return_value={"id": "different"}
        ) as request:
            with self.assertRaises(maintenance.MaintenanceError):
                maintenance.main(["inspect"])
            self.assertEqual(request.call_count, 1)

    def test_inspect_never_sends_cleanup(self):
        with patch.dict(os.environ, {"SUPABASE_ACCESS_TOKEN": "test-only"}), patch.object(
            maintenance, "api_request", side_effect=[{"id": maintenance.PROJECT_REF}, [{"inspection": self.snapshot()}]]
        ) as request, patch("builtins.print"):
            maintenance.main(["inspect"])
            self.assertEqual(request.call_count, 2)
            self.assertEqual(request.call_args.args[2], (maintenance.HERE / "inspect_internal_logs.sql").read_text())

    def test_ambiguous_cleanup_is_not_retried(self):
        with patch.dict(os.environ, {"SUPABASE_ACCESS_TOKEN": "test-only"}), patch.object(
            maintenance, "api_request", side_effect=[
                {"id": maintenance.PROJECT_REF}, [{"inspection": self.snapshot()}], maintenance.MaintenanceError("ambiguous")
            ]
        ) as request, patch("builtins.print"):
            with self.assertRaises(maintenance.MaintenanceError):
                maintenance.main(["apply", "--confirm-project", maintenance.PROJECT_REF])
            self.assertEqual(request.call_count, 3)

    def test_http_error_does_not_leak_response_or_token(self):
        opener = unittest.mock.Mock()
        opener.open.side_effect = urllib.error.HTTPError("secret-url", 403, "secret-response", {}, None)
        with patch.object(maintenance.urllib.request, "build_opener", return_value=opener):
            with self.assertRaises(maintenance.MaintenanceError) as error:
                maintenance.api_request("secret-token")
            self.assertNotIn("secret", str(error.exception))
            opener.open.assert_called_once()

    def test_changed_notification_schedule_fails_verification(self):
        before, after = self.snapshot(), self.snapshot()
        after["jobs"][0]["schedule"] = "0 11,15,20 * * *"
        with self.assertRaises(maintenance.MaintenanceError):
            maintenance.verify_after(before, after)

    def test_missing_retention_job_fails_verification(self):
        with self.assertRaises(maintenance.MaintenanceError):
            maintenance.verify_after(self.snapshot(), self.snapshot())

    def test_malformed_inspection_cannot_authorize_cleanup(self):
        with patch.dict(os.environ, {"SUPABASE_ACCESS_TOKEN": "test-only"}), patch.object(
            maintenance, "api_request", side_effect=[{"id": maintenance.PROJECT_REF}, []]
        ) as request, patch("builtins.print"):
            with self.assertRaises(maintenance.MaintenanceError):
                maintenance.main(["apply", "--confirm-project", maintenance.PROJECT_REF])
            self.assertEqual(request.call_count, 2)

    def test_empty_cleanup_result_is_not_success(self):
        with patch.dict(os.environ, {"SUPABASE_ACCESS_TOKEN": "test-only"}), patch.object(
            maintenance, "api_request", side_effect=[{"id": maintenance.PROJECT_REF}, [{"inspection": self.snapshot()}], []]
        ) as request, patch("builtins.print"):
            with self.assertRaises(maintenance.MaintenanceError):
                maintenance.main(["apply", "--confirm-project", maintenance.PROJECT_REF])
            self.assertEqual(request.call_count, 3)


if __name__ == "__main__":
    unittest.main()
