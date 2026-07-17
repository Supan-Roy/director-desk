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
                        # tmpfiles.org returns a viewer URL, e.g., https://tmpfiles.org/123/filename.png
                        # Replacing with /dl/ gives the download landing page URL
                        landing_url = url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/")
                        logger.info(f"Upload complete. Landing page URL: {landing_url}. Scraping direct download link...")
                        
                        # Scrape the dynamic direct download link from the HTML page
                        import re
                        try:
                            landing_resp = requests.get(
                                landing_url,
                                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                                timeout=10
                            )
                            if landing_resp.status_code == 200:
                                # Find the direct link in the HTML: <a class="download" href="...">
                                match = re.search(r'href="([^"]+/dl/[^"]+)"', landing_resp.text)
                                if match:
                                    direct_url = match.group(1)
                                    logger.info(f"Successfully scraped direct download URL: {direct_url}")
                                    return direct_url
                        except Exception as scrape_err:
                            logger.warning(f"Failed to scrape direct link from tmpfiles landing page: {scrape_err}")
                            
                        logger.warning("Falling back to constructed landing page URL.")
                        return landing_url
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
            
        # Force reload environment variables to pick up runtime .env/ngrok URL changes instantly
        from dotenv import load_dotenv
        try:
            if os.path.exists(".env"):
                load_dotenv(".env", override=True)
            elif os.path.exists("backend/.env"):
                load_dotenv("backend/.env", override=True)
            else:
                load_dotenv(override=True)
        except Exception as e:
            logger.warning(f"AssetResolver: failed to reload .env: {e}")
            
        # Already a public URL
        if local_path.startswith("http://") or local_path.startswith("https://"):
            # Check if it is a localhost URL. If PUBLIC_BASE_URL is defined, replace localhost with the tunnel URL
            public_base_url = os.getenv("PUBLIC_BASE_URL")
            if public_base_url and ("localhost" in local_path or "127.0.0.1" in local_path):
                from urllib.parse import urlparse
                parsed = urlparse(local_path)
                # Reconstruct path using the tunnel URL
                resolved_url = public_base_url.rstrip("/") + parsed.path
                logger.info(f"AssetResolver: mapped localhost URL {local_path} -> {resolved_url}")
                return resolved_url
            return local_path
            
        # If public base URL is defined (e.g. for ngrok tunnels), prepend it directly to the local static path
        public_base_url = os.getenv("PUBLIC_BASE_URL")
        if public_base_url:
            clean_rel = local_path
            if "://" in clean_rel:
                from urllib.parse import urlparse
                clean_rel = urlparse(clean_rel).path
            if "static/" in clean_rel:
                clean_rel = "/static/" + clean_rel.split("static/")[-1]
            if not clean_rel.startswith("/"):
                clean_rel = "/" + clean_rel
            
            resolved_url = public_base_url.rstrip("/") + clean_rel
            logger.info(f"AssetResolver: resolved local path {local_path} -> {resolved_url} using PUBLIC_BASE_URL")
            return resolved_url

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
                # Wait and verify that the uploaded file is publicly accessible and ready
                import requests
                for attempt in range(4):
                    # We start with a sleep of 1.5s on the first attempt to let the CDN propagate.
                    # On subsequent attempts we sleep 2.0s, up to 4 attempts total (approx 7.5 seconds max wait).
                    sleep_time = 1.5 if attempt == 0 else 2.0
                    logger.info(f"AssetResolver: waiting {sleep_time}s for CDN propagation (attempt {attempt+1}/4)...")
                    await asyncio.sleep(sleep_time)
                    try:
                        verify_res = await asyncio.to_thread(
                            requests.get, 
                            public_url, 
                            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}, 
                            timeout=5
                        )
                        if verify_res.status_code == 200:
                            logger.info(f"AssetResolver: verified URL is reachable with status 200 on attempt {attempt+1}")
                            return public_url
                        else:
                            logger.warning(f"AssetResolver: verification returned status {verify_res.status_code} on attempt {attempt+1}")
                    except Exception as e:
                        logger.warning(f"AssetResolver: verification request failed on attempt {attempt+1}: {e}")
                
                logger.warning(f"AssetResolver: resolved URL {public_url} could not be verified as active after 4 attempts. Returning it anyway.")
                return public_url
            else:
                logger.warning(f"AssetResolver: failed to upload {fs_path} via provider {provider.__class__.__name__}")
        except Exception as e:
            logger.error(f"AssetResolver error uploading {fs_path}: {e}")
            
        # Fallback to local path if upload fails
        return local_path
