import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("QWEN_API_KEY"),
    base_url=os.getenv("QWEN_BASE_URL")
)


class QwenService:

    def generate_text(self, prompt: str) -> str:

        response = client.chat.completions.create(
            model=os.getenv("QWEN_MODEL"),
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return response.choices[0].message.content


qwen_service = QwenService()