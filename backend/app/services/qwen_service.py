class QwenService:
    def __init__(self, api_base_url: str = '', api_key: str = '') -> None:
        self.api_base_url = api_base_url
        self.api_key = api_key

    def is_configured(self) -> bool:
        return bool(self.api_base_url and self.api_key)
