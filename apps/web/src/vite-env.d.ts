/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPTIMISM_RPC_URL?: string;
  readonly VITE_APP_DOMAIN?: string;
  readonly VITE_SIWF_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
