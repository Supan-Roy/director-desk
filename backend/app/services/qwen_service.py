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

    def generate_image(self, prompt: str) -> str:
        import urllib.request
        import urllib.error
        import json
        import time
        import os
        import logging

        logger = logging.getLogger(__name__)

        api_key = os.getenv("QWEN_API_KEY")
        if not api_key:
            raise RuntimeError("QWEN_API_KEY is not set.")

        model = os.getenv("QWEN_IMAGE_MODEL", "wan-t2i")
        # Map wan-t2i to wan2.6-t2i on international endpoint
        if model == "wan-t2i":
            model = "wan2.6-t2i"

        api_base = os.getenv("QWEN_API_BASE_URL") or "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
        
        if "/compatible-mode" in api_base:
            base_host = api_base.split("/compatible-mode")[0]
        else:
            base_host = "https://dashscope-intl.aliyuncs.com"

        # Check if we should use multimodal-generation/generation endpoint (for wan v2 models)
        is_wan_multimodal = model.startswith("wan2.") or model in ["wan-t2i", "wan2.6-t2i", "wan2.7-image-pro"]

        if is_wan_multimodal:
            submit_url = f"{base_host}/api/v1/services/aigc/multimodal-generation/generation"
            payload = {
                "model": model,
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"text": prompt}
                            ]
                        }
                    ]
                },
                "parameters": {
                    "size": "1920*1080",
                    "n": 1
                }
            }
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            logger.info(f"Calling DashScope Multimodal Generation for {model} (Synchronous): {submit_url}")
            try:
                req = urllib.request.Request(
                    submit_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=60) as response:
                    resp_data = json.loads(response.read().decode("utf-8"))
                
                if "code" in resp_data:
                    raise RuntimeError(f"DashScope error: {resp_data.get('code')} - {resp_data.get('message')}")
                
                choices = resp_data.get("output", {}).get("choices", [])
                if not choices:
                    raise RuntimeError(f"No choices in response: {resp_data}")
                
                content = choices[0].get("message", {}).get("content", [])
                if not content:
                    raise RuntimeError(f"No content in choice message: {resp_data}")
                
                image_url = None
                for item in content:
                    if item.get("type") == "image":
                        image_url = item.get("image")
                        break
                
                if not image_url:
                    raise RuntimeError(f"No image URL found in response: {resp_data}")
                
                logger.info(f"Multimodal image generation succeeded. URL={image_url}")
                return image_url
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="replace")
                logger.error(f"DashScope multimodal generation HTTP error {e.code}: {err_body}")
                raise RuntimeError(f"DashScope image generation HTTP error {e.code}: {err_body}")
            except Exception as e:
                logger.error(f"Failed to run multimodal generation: {e}")
                raise

        # Fallback to legacy asynchronous text2image/image-synthesis endpoint (e.g. for wanx-v1)
        submit_url = f"{base_host}/api/v1/services/aigc/text2image/image-synthesis"
        payload = {
            "model": model,
            "input": {
                "prompt": prompt
            },
            "parameters": {
                "size": "1920*1080",
                "n": 1
            }
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable"
        }
        
        logger.info(f"Submitting image gen task to DashScope: Model={model}")
        try:
            req = urllib.request.Request(
                submit_url, 
                data=json.dumps(payload).encode("utf-8"), 
                headers=headers, 
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                
            task_id = resp_data.get("output", {}).get("task_id")
            if not task_id:
                raise RuntimeError(f"DashScope did not return a task_id. Response: {resp_data}")
                
            logger.info(f"Task submitted successfully. TaskID={task_id}. Polling status...")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            logger.error(f"DashScope task submission failed: {e.code} - {err_body}")
            raise RuntimeError(f"DashScope image submission HTTP error {e.code}: {err_body}")
        except Exception as e:
            logger.error(f"Failed to submit task: {e}")
            raise

        # Poll the task status
        poll_url = f"{base_host}/api/v1/tasks/{task_id}"
        poll_headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        # Max polling duration: 120 seconds
        for attempt in range(60):
            time.sleep(2)
            try:
                poll_req = urllib.request.Request(poll_url, headers=poll_headers, method="GET")
                with urllib.request.urlopen(poll_req, timeout=10) as response:
                    poll_data = json.loads(response.read().decode("utf-8"))
                    
                output = poll_data.get("output", {})
                status = output.get("task_status")
                logger.info(f"Polling task {task_id}: status={status}")
                
                if status == "SUCCEEDED":
                    results = output.get("results", [])
                    if results and "url" in results[0]:
                        image_url = results[0]["url"]
                        logger.info(f"Image generation succeeded. URL={image_url}")
                        return image_url
                    else:
                        raise RuntimeError(f"SUCCEEDED task has no results url: {poll_data}")
                elif status in ["FAILED", "CANCELED"]:
                    err_msg = output.get("message") or "Unknown error"
                    raise RuntimeError(f"DashScope image gen task failed/canceled: {err_msg}")
            except urllib.error.HTTPError as e:
                logger.warning(f"Polling HTTP error {e.code}, retrying...")
            except Exception as e:
                logger.warning(f"Polling error {e}, retrying...")
                
        raise RuntimeError("DashScope image generation task timed out after 120 seconds.")

    def generate_video(self, prompt: str, model: str, image_url: str = None, duration: int = None) -> str:
        import urllib.request
        import urllib.error
        import json
        import time
        import os
        import logging

        logger = logging.getLogger(__name__)

        api_key = os.getenv("QWEN_API_KEY")
        if not api_key:
            raise RuntimeError("QWEN_API_KEY is not set.")

        api_base = os.getenv("QWEN_API_BASE_URL") or "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
        if "/compatible-mode" in api_base:
            base_host = api_base.split("/compatible-mode")[0]
        else:
            base_host = "https://dashscope-intl.aliyuncs.com"

        submit_url = f"{base_host}/api/v1/services/aigc/video-generation/video-synthesis"

        # Prepare payload dynamically based on model characteristics
        input_data = {
            "prompt": prompt
        }
        parameters = {}
        
        is_i2v = "i2v" in model or "happyhorse" in model
        
        if is_i2v:
            if image_url:
                input_data["media"] = [
                    {
                        "type": "first_frame",
                        "url": image_url
                    }
                ]
            parameters = {
                "resolution": "720P"
            }
        else:
            # Text-to-video models like wan2.7-t2v
            parameters = {
                "size": "1280*720"
            }

        if duration is not None:
            clamped_duration = max(2, min(15, int(duration)))
            parameters["duration"] = clamped_duration
            
        payload = {
            "model": model,
            "input": input_data,
            "parameters": parameters
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable"
        }

        logger.info(f"Submitting video synthesis task to DashScope: Model={model}, Prompt='{prompt[:60]}'")
        try:
            req = urllib.request.Request(
                submit_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                
            task_id = resp_data.get("output", {}).get("task_id")
            if not task_id:
                # Check for direct error
                if "code" in resp_data:
                    raise RuntimeError(f"DashScope error: {resp_data.get('code')} - {resp_data.get('message')}")
                raise RuntimeError(f"DashScope did not return a task_id. Response: {resp_data}")
                
            logger.info(f"Video synthesis task submitted successfully. TaskID={task_id}. Polling status...")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            logger.error(f"DashScope task submission failed: {e.code} - {err_body}")
            raise RuntimeError(f"DashScope video submission HTTP error {e.code}: {err_body}")
        except Exception as e:
            logger.error(f"Failed to submit task: {e}")
            raise

        # Poll the task status
        poll_url = f"{base_host}/api/v1/tasks/{task_id}"
        poll_headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        # Max polling duration: 300 seconds (5 minutes)
        for attempt in range(60):
            time.sleep(5)
            try:
                poll_req = urllib.request.Request(poll_url, headers=poll_headers, method="GET")
                with urllib.request.urlopen(poll_req, timeout=15) as response:
                    poll_data = json.loads(response.read().decode("utf-8"))
                    
                output = poll_data.get("output", {})
                status = output.get("task_status")
                logger.info(f"Polling video task {task_id}: status={status}")
                
                if status == "SUCCEEDED":
                    video_url = None
                    if "video_url" in output:
                        video_url = output["video_url"]
                    elif "results" in output and len(output["results"]) > 0:
                        video_url = output["results"][0].get("url")
                    
                    if video_url:
                        logger.info(f"Video synthesis succeeded. URL={video_url}")
                        return video_url
                    else:
                        raise RuntimeError(f"SUCCEEDED video task has no video url in output: {poll_data}")
                        
                elif status in ["FAILED", "CANCELED"]:
                    err_msg = output.get("message") or poll_data.get("message") or "Unknown error"
                    raise RuntimeError(f"DashScope video gen task failed/canceled: {err_msg}")
            except urllib.error.HTTPError as e:
                logger.warning(f"Polling video HTTP error {e.code}, retrying...")
            except Exception as e:
                if "failed/canceled" in str(e) or "has no video url" in str(e):
                    raise e
                logger.warning(f"Polling video error {e}, retrying...")
                
        raise RuntimeError("DashScope video generation task timed out after 300 seconds.")


qwen_service = QwenService()