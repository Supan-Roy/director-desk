import logging
import asyncio
import os
import requests
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class StorageProvider(ABC):
    @abstractmethod
    def upload(self, local_path: str) -> str | None:
        """Uploads a local file and returns a public URL, or None if failed."""
        pass

class TmpFilesStorageProvider(StorageProvider):
    def upload(self, local_path: str) -> str | None:
        try:
            clean_path = local_path.lstrip("/")
            if not os.path.exists(clean_path):
                alt_path = os.path.join("backend", clean_path)
                if os.path.exists(alt_path):
                    clean_path = alt_path
                else:
                    logger.error(f"Local reference image not found: {local_path} (checked {clean_path} and {alt_path})")
                    return None

            logger.info(f"Uploading {clean_path} to tmpfiles.org...")
            with open(clean_path, 'rb') as f:
                files = {'file': f}
                response = requests.post('https://tmpfiles.org/api/v1/upload', files=files, timeout=15)
                if response.status_code == 200:
                    res_data = response.json()
                    url = res_data.get("data", {}).get("url")
                    if url:
                        direct_url = url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/")
                        logger.info(f"Upload complete. Direct URL: {direct_url}")
                        return direct_url
                logger.error(f"tmpfiles.org upload failed with status code {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error in TmpFilesStorageProvider upload for {local_path}: {e}")
        return None

# Factory to get active provider (could load from environment variables in the future)
def get_active_storage_provider() -> StorageProvider:
    provider_name = os.getenv("STORAGE_PROVIDER", "tmpfiles").lower()
    if provider_name == "tmpfiles":
        return TmpFilesStorageProvider()
    # Fallback to tmpfiles
    return TmpFilesStorageProvider()

class AssetResolver:
    @staticmethod
    async def resolve_asset(local_path: str) -> str:
        """
        Resolves a local static image or media path to a public CDN/host URL.
        Decouples storage backend selection from scene generation.
        """
        if not local_path:
            return ""
            
        # Already a public URL
        if local_path.startswith("http://") or local_path.startswith("https://"):
            return local_path
            
        # Clean local path portion if it contains base scheme
        path_to_upload = local_path
        if "://" in path_to_upload:
            from urllib.parse import urlparse
            path_to_upload = urlparse(path_to_upload).path
            
        # Ensure it maps to local file system correctly (removes leading slash if needed)
        fs_path = path_to_upload.lstrip("/")
        if not os.path.exists(fs_path) and os.path.exists(os.path.join("backend", fs_path)):
            fs_path = os.path.join("backend", fs_path)
            
        logger.info(f"Resolving local file path: {fs_path} (from raw: {local_path})")
        
        try:
            provider = get_active_storage_provider()
            public_url = await asyncio.to_thread(provider.upload, fs_path)
            if public_url:
                logger.info(f"AssetResolver: successfully resolved {local_path} to {public_url}")
                return public_url
            else:
                logger.warning(f"AssetResolver: failed to upload {fs_path} via provider {provider.__class__.__name__}")
        except Exception as e:
            logger.error(f"AssetResolver error uploading {fs_path}: {e}")
            
        # Fallback to local path if upload fails
        return local_path
