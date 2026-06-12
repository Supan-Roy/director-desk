import os
from typing import Generator

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

    def generate_text_stream(self, prompt: str) -> Generator[str, None, None]:

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
            ],
            stream=True
        )

        for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    def analyze_image(self, base64_image: str, mime_type: str) -> str:
        if not os.getenv("QWEN_API_KEY"):
            raise RuntimeError(
                "QWEN_API_KEY is not set. "
                "Copy backend/.env.example to backend/.env and add your API key."
            )

        model = os.getenv("QWEN_VISION_MODEL", "qwen-vl-plus")
        image_url = f"data:{mime_type};base64,{base64_image}"

        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Calling Qwen Vision ({model}) for image understanding...")

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe this image in detail. Focus on characters, actions, background environment, camera angles, lighting, style, colors, and mood. Keep it descriptive, as this description will be used as a creative production context."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        }
                    ]
                }
            ]
        )

        description = response.choices[0].message.content
        logger.info(f"Image analysis complete: {len(description)} characters")
        return description


qwen_service = QwenService()