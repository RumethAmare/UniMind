import json

import httpx
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.errors import AppError


class LLMProvider:
    def __init__(self, provider: str = settings.llm_provider):
        normalized = provider.lower()
        if normalized == "openai":
            self.provider = OpenAIProvider()
        elif normalized == "gemini":
            self.provider = GeminiProvider()
        else:
            raise AppError(f"Unsupported LLM provider: {provider}")

    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        return await self.provider.complete_json(system_prompt, user_prompt)


class OpenAIProvider:
    def __init__(self):
        if not settings.openai_api_key:
            self.client = None
        else:
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
            response = await client.post(url, params={"key": self.api_key}, json=payload)
        if response.status_code >= 400:
            detail = self._extract_error(response)
            raise AppError(f"Gemini API error: {detail}")

        data = response.json()
        content = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "{}")
        )
        return json.loads(content)

    def _extract_error(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return response.text
        error = payload.get("error")
        if isinstance(error, dict):
            return str(error.get("message") or error)
        return str(payload)
