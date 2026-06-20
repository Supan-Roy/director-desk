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

        # Security constraints
        MAX_SIZE_BYTES = 200 * 1024 * 1024  # 200MB
        blocked_extensions = {
            '.zip', '.rar', '.7z', '.tar', '.gz', '.xz', '.bz2',
            '.exe', '.bat', '.cmd', '.sh', '.py', '.js', '.jsx', '.ts', '.tsx', '.vbs', '.msi',
            '.html', '.htm', '.xhtml', '.svg'
        }
        blocked_mimes = {
            'application/zip',
            'application/x-zip-compressed',
            'application/zip-compressed',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/x-tar',
            'application/gzip',
            'application/x-gzip',
            'application/x-msdownload',
            'application/x-sh',
            'application/x-python',
            'text/html',
            'image/svg+xml'
        }
        allowed_extensions = {'.pdf', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.doc', '.docx'}
        allowed_mimes = {
            'application/pdf', 'text/plain', 'text/markdown',
            'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }

        import os
        import re

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

            # 1. Filename sanitization (Path traversal & Injection guardrail)
            # Remove leading dots/slashes and replace any internal slashes with underscores
            sanitized_name = re.sub(r'^[./\\]+', '', name)
            sanitized_name = re.sub(r'[/\\]', '_', sanitized_name)
            # Keep only alphanumeric, dots, dashes, underscores, spaces
            sanitized_name = re.sub(r'[^a-zA-Z0-9_\-\.\s]', '', sanitized_name)
            
            _, ext = os.path.splitext(sanitized_name.lower())

            # 2. Blocklist validation (ZIP / Archives / Executables / Scripts)
            is_blocked_ext = ext in blocked_extensions
            is_blocked_mime = any(bm in file_type for bm in blocked_mimes)
            if is_blocked_ext or is_blocked_mime:
                logger.error(f"Security Block: Blocked file type detected (ext: {ext}, mime: {file_type}) for file: {name}")
                raise ValueError(f"Security violation: Archives, scripts, or executables (like ZIP/TAR/SH/PY) are not allowed.")

            # 3. Allowlist validation (PDF, TXT, MD, DOC, DOCX, Images)
            is_allowed_ext = ext in allowed_extensions
            is_allowed_mime = any(am in file_type for am in allowed_mimes)
            is_image = file_type.startswith("image/") and "svg" not in file_type
            is_doc = "pdf" in file_type or "text" in file_type or "markdown" in file_type or "msword" in file_type or "wordprocessingml" in file_type
            
            if not (is_allowed_ext or is_allowed_mime or is_image or is_doc):
                logger.error(f"Security Block: Unsupported file format (ext: {ext}, mime: {file_type}) for file: {name}")
                raise ValueError(f"Security violation: Unsupported file format for file '{name}'. Only PDF, TXT, MD, DOC, DOCX, PNG, JPG, WEBP, and GIF are allowed.")

            # 4. File Size validation (200MB limit)
            estimated_size = len(content)
            if "," in content:
                # Base64 with data URI header
                _, b64_data = content.split(",", 1)
                estimated_size = (len(b64_data) * 3) // 4
            else:
                try:
                    # Check if plain base64 without header
                    decoded_len = len(base64.b64decode(content))
                    estimated_size = decoded_len
                except Exception:
                    # Raw text content string
                    estimated_size = len(content.encode('utf-8', errors='ignore'))

            if estimated_size > MAX_SIZE_BYTES:
                logger.error(f"Security Block: File size {estimated_size} bytes exceeds limit of {MAX_SIZE_BYTES} bytes")
                raise ValueError(f"Security violation: File size exceeds the 200MB limit for file '{name}'.")

            # Update name to sanitized name for safe processing
            name = sanitized_name

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
                elif "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in file_type or name.endswith(".docx"):
                    logger.info(f"Processing DOCX file: {name}")
                    if "," in content:
                        _, content = content.split(",", 1)
                    docx_bytes = base64.b64decode(content)
                    extracted_text = self._extract_docx_text(docx_bytes)
                    extracted_parts.append(
                        f"--- BEGIN UPLOADED FILE: {name} ---\n"
                        f"{extracted_text}\n"
                        f"--- END UPLOADED FILE: {name} ---"
                    )

                elif "application/msword" in file_type or name.endswith(".doc"):
                    logger.info(f"Processing DOC file: {name}")
                    if "," in content:
                        _, content = content.split(",", 1)
                    doc_bytes = base64.b64decode(content)
                    extracted_text = self._extract_doc_text(doc_bytes)
                    extracted_parts.append(
                        f"--- BEGIN UPLOADED FILE: {name} ---\n"
                        f"{extracted_text}\n"
                        f"--- END UPLOADED FILE: {name} ---"
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

    def _extract_docx_text(self, docx_bytes: bytes) -> str:
        import zipfile
        import xml.etree.ElementTree as ET
        import io
        try:
            with zipfile.ZipFile(io.BytesIO(docx_bytes)) as docx:
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                xml_content = docx.read('word/document.xml')
                root = ET.fromstring(xml_content)
                
                paragraphs = []
                for p in root.findall('.//w:p', namespaces):
                    p_text = []
                    for t in p.findall('.//w:t', namespaces):
                        if t.text:
                            p_text.append(t.text)
                    if p_text:
                        paragraphs.append("".join(p_text))
                
                return "\n".join(paragraphs)
        except Exception as e:
            logger.error(f"Failed to parse DOCX: {e}", exc_info=True)
            return f"[Failed to extract DOCX text: {str(e)}]"

    def _extract_doc_text(self, doc_bytes: bytes) -> str:
        import re
        try:
            # Simple fallback text strings extractor for binary .doc files
            ascii_strings = re.findall(rb'[ -~]{4,}', doc_bytes)
            text_lines = []
            for s in ascii_strings:
                try:
                    decoded = s.decode('ascii').strip()
                    # Filter out standard OLE metadata/formatting noise
                    if len(decoded) > 8 and not decoded.startswith(('Style', 'Normal', 'Title', 'Heading', 'Font', 'Author', 'Microsoft')):
                        text_lines.append(decoded)
                except Exception:
                    continue
            
            extracted = "\n".join(text_lines)
            if not extracted.strip():
                return "[Legacy .doc binary parsing is limited. Please convert to .docx for full text extraction.]"
            return extracted
        except Exception as e:
            logger.error(f"Failed to parse DOC: {e}", exc_info=True)
            return f"[Failed to extract legacy DOC text: {str(e)}. Please convert to .docx]"

content_processor = ContentProcessor()
