import os
import unittest
from unittest.mock import patch

import app as nova


class QuotaError(Exception):
    code = 429


class FakeModels:
    def __init__(self, outcomes):
        self.outcomes = outcomes
        self.calls = []

    def generate_content(self, *, model, contents):
        self.calls.append(model)
        outcome = self.outcomes[model]
        if isinstance(outcome, Exception):
            raise outcome
        return type("Response", (), {"text": outcome})()


class FakeClient:
    def __init__(self, outcomes):
        self.models = FakeModels(outcomes)


class GeminiFallbackTests(unittest.TestCase):
    def setUp(self):
        nova.MODEL_COOLDOWNS.clear()

    def tearDown(self):
        nova.MODEL_COOLDOWNS.clear()

    def test_rate_limited_model_switches_to_next_model(self):
        client = FakeClient({"model-one": QuotaError("429 quota"), "model-two": "Answer from model two"})

        answer = nova.generate_with_fallback("Hello", client=client, models=["model-one", "model-two"])

        self.assertEqual(answer, "Answer from model two")
        self.assertEqual(client.models.calls, ["model-one", "model-two"])
        self.assertGreater(nova.cooldown_remaining("model-one"), 0)

    def test_all_models_failing_keeps_local_chat_fallback(self):
        with patch("app.gemini_response", return_value=None):
            client = nova.app.test_client()
            response = client.post("/api/chat", json={
                "message": "What is Python?",
                "subject": "Computer Science",
                "level": "College",
            })

        self.assertEqual(response.status_code, 200)
        self.assertIn("high-level, general-purpose", response.get_json()["reply"])

    def test_cooling_down_model_is_skipped(self):
        nova.set_model_cooldown("model-one", 60)
        client = FakeClient({"model-one": "Should not run", "model-two": "Answer from model two"})

        answer = nova.generate_with_fallback("Hello", client=client, models=["model-one", "model-two"])

        self.assertEqual(answer, "Answer from model two")
        self.assertEqual(client.models.calls, ["model-two"])

    def test_additional_keys_keep_legacy_key_first_without_duplicates(self):
        with patch.dict(os.environ, {
            "GEMINI_API_KEY": "first-key",
            "GEMINI_API_KEYS": "first-key, second-key",
        }, clear=False):
            self.assertEqual(nova.gemini_api_keys(), ["first-key", "second-key"])


if __name__ == "__main__":
    unittest.main()
