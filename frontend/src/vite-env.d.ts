/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCK?: string;
  readonly VITE_SHARE_LINK_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
