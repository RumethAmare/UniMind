import json

import httpx

from app.core.config import settings
from app.core.errors import AppError


def extract_json_object(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start : end + 1])


class OpenAIProvider:
    def __init__(self):
        if not settings.openai_api_key:
            self.client = None
        else:
            from openai import AsyncOpenAI

            self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        if self.client is None:
            raise AppError("OPENAI_API_KEY is not configured")
        response = await self.client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        content = response.choices[0].message.content or "{}"
        return json.loads(content)


class GeminiProvider:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model
        self.base_url = settings.gemini_api_base_url.rstrip("/")

    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        if not self.api_key:
            raise AppError("GEMINI_API_KEY is not configured")
        url = f"{self.base_url}/models/{self.model}:generateContent"
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": self.api_key, "Content-Type": "application/json"},
                json=payload,
            )
        if response.status_code >= 400:
            raise AppError(f"Gemini request failed: {response.text}", response.status_code)
        body = response.json()
        try:
            text = body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AppError("Gemini response did not include generated text") from exc
        return extract_json_object(text or "{}")


def create_llm_provider():
    if settings.gemini_api_key:
        return GeminiProvider()
    return OpenAIProvider()
