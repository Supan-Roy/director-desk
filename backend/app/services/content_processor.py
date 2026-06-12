import base64
import io
import logging
from typing import List, Any
import pypdf
from app.services.qwen_service import qwen_service

logger = logging.getLogger(__name__)

class ContentProcessor:
    def process_files(self, files: List[Any]) -> str:
        """
        Process a list of files (either FilePayload pydantic models or dicts)
        and extract text content, returning a unified text context block.
        """
        if not files:
            return ""

        extracted_parts = []
        logger.info(f"ContentProcessor: Processing {len(files)} files...")

        for file_item in files:
            # Handle both pydantic model and dict
            if hasattr(file_item, "dict"):
                file_dict = file_item.dict()
            else:
                file_dict = file_item

            name = file_dict.get("name", "Unnamed File")
            file_type = file_dict.get("type", "").lower()
            content = file_dict.get("content", "")

            if not content:
                continue

            try:
                if "application/pdf" in file_type or name.endswith(".pdf"):
                    # Extract PDF locally using pypdf
                    logger.info(f"Processing PDF file: {name}")
                    
                    # Strip data URI header if present
                    if "," in content:
                        _, content = content.split(",", 1)
                        
                    pdf_bytes = base64.b64decode(content)
                    pdf_file = io.BytesIO(pdf_bytes)
                    
                    reader = pypdf.PdfReader(pdf_file)
                    text_content = []
                    for i, page in enumerate(reader.pages):
                        page_text = page.extract_text()
                        if page_text:
                            text_content.append(page_text)
                    
                    extracted_text = "\n".join(text_content)
                    if not extracted_text.strip():
                        extracted_text = "[No readable text found in PDF]"
                    
                    extracted_parts.append(
                        f"--- BEGIN UPLOADED FILE: {name} ---\n"
                        f"{extracted_text}\n"
                        f"--- END UPLOADED FILE: {name} ---"
                    )

                elif "text/" in file_type or name.endswith((".txt", ".md")):
                    # Read TXT and Markdown directly
                    logger.info(f"Processing text file: {name}")
                    
                    # Strip data URI header if present
                    if "," in content:
                        _, content = content.split(",", 1)
                        
                    try:
                        # Try decoding as base64
                        decoded_bytes = base64.b64decode(content)
                        text_data = decoded_bytes.decode("utf-8", errors="ignore")
                    except Exception:
                        # If failed, treat as raw text
                        text_data = content

                    extracted_parts.append(
                        f"--- BEGIN UPLOADED FILE: {name} ---\n"
                        f"{text_data}\n"
                        f"--- END UPLOADED FILE: {name} ---"
                    )

                elif "image/" in file_type or name.endswith((".png", ".jpg", ".jpeg", ".webp")):
                    # Use Qwen Vision for image understanding
                    logger.info(f"Processing image file with Qwen Vision: {name}")
                    
                    # Strip data URI header if present
                    if "," in content:
                        _, content = content.split(",", 1)
                    
                    # Call analyze_image
                    image_description = qwen_service.analyze_image(content, file_type)
                    extracted_parts.append(
                        f"--- BEGIN UPLOADED FILE (Visual Content Analysis): {name} ---\n"
                        f"Image Description: {image_description}\n"
                        f"--- END UPLOADED FILE (Visual Content Analysis): {name} ---"
                    )
                else:
                    logger.warning(f"Unsupported file type: {file_type} for file: {name}")
            except Exception as e:
                logger.error(f"Error processing file {name}: {e}", exc_info=True)
                extracted_parts.append(
                    f"--- ERROR PROCESSING FILE: {name} ---\n"
                    f"Error detail: {str(e)}\n"
                    f"--- END ERROR ---"
                )

        if not extracted_parts:
            return ""

        unified_context = "\n\n".join(extracted_parts)
        return unified_context

content_processor = ContentProcessor()
