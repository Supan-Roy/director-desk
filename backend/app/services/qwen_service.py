import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("QWEN_API_KEY"),
    base_url=os.getenv("QWEN_API_BASE_URL") or None,
)


class QwenService:

    def generate_text(self, prompt: str) -> str:

        if not os.getenv("QWEN_API_KEY"):
            raise RuntimeError(
                "QWEN_API_KEY is not set. "
                "Copy backend/.env.example to backend/.env and add your API key."
            )

        response = client.chat.completions.create(
            model=os.getenv("QWEN_MODEL", "qwen-plus"),
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return response.choices[0].message.content


qwen_service = QwenService()