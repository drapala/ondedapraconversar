/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_INSTAGRAM?: string;
  readonly VITE_RESPONSAVEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
