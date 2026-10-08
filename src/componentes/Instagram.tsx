// Perfil do projeto no Instagram: endereço, @ e ícone, num lugar só.
// O perfil vem de VITE_INSTAGRAM (só o nome, com ou sem @). Sem ele, o site não mostra o Instagram.
//
// Autor: Matheus C. Pestana

const PERFIL = (import.meta.env.VITE_INSTAGRAM ?? "").trim().replace(/^@/, "");

export const TEM_INSTAGRAM = PERFIL !== "";
export const INSTAGRAM_URL = `https://www.instagram.com/${PERFIL}/`;
export const INSTAGRAM_ARROBA = `@${PERFIL}`;

export function IconeInstagram({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.25" fill="currentColor" />
    </svg>
  );
}
