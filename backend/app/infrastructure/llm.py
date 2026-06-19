import json

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.errors import AppError


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

