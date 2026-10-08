// Servidor de teste: entrega o site já construído (dist/) e guarda a contagem
// de quem vai conversar em cada região. Sem conta, sem login, sem banco.
// Um aparelho conta uma vez por região. O identificador do aparelho é guardado
// só como hash.
//
// Uso: npm run build && npm run servidor
// LIBERAR_JANELA=1 deixa marcar fora da janela de conversa (só para teste).
//
// Autor: Matheus C. Pestana

import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { createGzip } from "node:zlib";
import { faseEm, podeMarcar } from "../src/calendario.ts";

const PORTA = Number(process.env.PORT ?? 8787);
const RAIZ = resolve(import.meta.dirname, "..");
const SITE = join(RAIZ, "dist");
const DADOS = existsSync(join(SITE, "dados")) ? join(SITE, "dados") : join(RAIZ, "public", "dados");
const ARQUIVO = join(import.meta.dirname, "marcas.json");
const ARQUIVO_EMAILS = join(import.meta.dirname, "emails.json");
const SAL = process.env.SAL_MARCAS ?? "onde-da-pra-conversar";
const LIBERAR = process.env.LIBERAR_JANELA === "1";

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

/** @type {Map<string, Set<string>>} */
const marcas = new Map();
if (existsSync(ARQUIVO)) {
  for (const [regiao, lista] of Object.entries(JSON.parse(readFileSync(ARQUIVO, "utf-8")))) {
    marcas.set(regiao, new Set(lista));
  }
}

let gravacao = null;
function gravarDepois() {
  clearTimeout(gravacao);
  gravacao = setTimeout(() => {
    const objeto = Object.fromEntries([...marcas].map(([k, v]) => [k, [...v]]));
    writeFileSync(`${ARQUIVO}.parcial`, JSON.stringify(objeto));
    renameSync(`${ARQUIVO}.parcial`, ARQUIVO);
  }, 500);
}

const janelas = new Map();
function dentroDoLimite(ip, tipo, maximo, janelaMs) {
  const chave = `${tipo}|${ip}`;
  const agora = Date.now();
  const lista = (janelas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  lista.push(agora);
  janelas.set(chave, lista);
  return lista.length <= maximo;
}

const celulas = new Map();
function situacaoDaRegiao(id) {
  const partes = /^([a-z]{2})-(\d{5})-(-?\d+\.\d{4})-(-?\d+\.\d{4})$/.exec(id);
  if (!partes) return null;
  const lat = Number(partes[3]);
  const lon = Number(partes[4]);
  const chave = `${Math.floor(lat / 0.25)}_${Math.floor(lon / 0.25)}`;
  if (!celulas.has(chave)) {
    const caminho = join(DADOS, "celulas", `${chave}.json`);
    celulas.set(chave, existsSync(caminho) ? JSON.parse(readFileSync(caminho, "utf-8")) : []);
  }
  const regiao = celulas.get(chave).find((r) => r.id === id);
  if (!regiao) return null;
  return regiao.votos ? "conversa" : "sem_boletim";
}

function json(res, status, corpo) {
  res.writeHead(status, { "content-type": TIPOS[".json"], "cache-control": "no-store" });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let texto = "";
    req.on("data", (pedaco) => {
      texto += pedaco;
      if (texto.length > 2000) req.destroy();
    });
    req.on("end", () => {
      try {
        ok(JSON.parse(texto));
      } catch (erro) {
        falha(erro);
      }
    });
    req.on("error", falha);
  });
}

async function api(req, res, url) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "";
  if (req.method === "GET") {
    if (!dentroDoLimite(ip, "ler", 600, 60_000)) return json(res, 429, { motivo: "Muitos pedidos. Espere um minuto." });
    const ids = (url.searchParams.get("regioes") ?? "").split(",").filter(Boolean).slice(0, 400);
    return json(res, 200, Object.fromEntries(ids.map((id) => [id, marcas.get(id)?.size ?? 0])));
  }
  if (req.method !== "POST" && req.method !== "DELETE") return json(res, 405, { motivo: "Método não aceito." });
  if (!dentroDoLimite(ip, "marcar", 120, 3_600_000)) {
    return json(res, 429, { motivo: "Muitas marcas deste aparelho na última hora." });
  }
  if (!LIBERAR && !podeMarcar(faseEm(Date.now()))) {
    return json(res, 403, { motivo: "A marcação está fechada agora." });
  }
  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch {
    return json(res, 400, { motivo: "Pedido malformado." });
  }
  const { regiao, aparelho } = corpo ?? {};
  if (typeof aparelho !== "string" || !/^[0-9a-f-]{36}$/.test(aparelho)) {
    return json(res, 400, { motivo: "Aparelho inválido." });
  }
  if (typeof regiao !== "string" || situacaoDaRegiao(regiao) !== "conversa") {
    return json(res, 400, { motivo: "Essa região não está na lista de conversa." });
  }
  const hash = createHash("sha256").update(`${SAL}|${aparelho}`).digest("hex").slice(0, 32);
  const conjunto = marcas.get(regiao) ?? new Set();
  if (req.method === "POST") conjunto.add(hash);
  else conjunto.delete(hash);
  if (conjunto.size) marcas.set(regiao, conjunto);
  else marcas.delete(regiao);
  gravarDepois();
  return json(res, 200, { total: conjunto.size });
}

/** Cadastro de e-mail para teste local (api/email.ts na Vercel); grava em servidor/emails.json. */
async function email(req, res) {
  if (req.method !== "POST") return json(res, 405, { motivo: "Método não aceito." });
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "";
  if (!dentroDoLimite(ip, "email", 8, 3_600_000)) return json(res, 429, { motivo: "Muitas tentativas por aqui. Tente de novo mais tarde." });
  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch {
    return json(res, 400, { motivo: "Pedido malformado." });
  }
  const { email: bruto, whatsapp, aceite, site, origem } = corpo ?? {};
  if (typeof site === "string" && site !== "") return json(res, 200, { ok: true });
  if (aceite !== true) return json(res, 400, { motivo: "Marque a caixa para aceitar receber os e-mails." });
  const endereco = typeof bruto === "string" ? bruto.trim().toLowerCase() : "";
  if (!endereco || endereco.length > 254 || !/^[^\s@<>(),;:"\\[\]]+@[^\s@<>(),;:"\\[\]]+\.[^\s@<>(),;:"\\[\]]{2,}$/.test(endereco)) {
    return json(res, 400, { motivo: "Confira o e-mail: parece que falta alguma coisa." });
  }
  let numero = "";
  if (typeof whatsapp === "string" && whatsapp.trim() !== "") {
    let digitos = whatsapp.replace(/\D/g, "");
    if (digitos.startsWith("55") && digitos.length >= 12) digitos = digitos.slice(2);
    numero = `+55${digitos.replace(/^0+/, "")}`;
    if (!/^\+55[1-9][1-9]\d{8,9}$/.test(numero)) return json(res, 400, { motivo: "Confira o WhatsApp: use o DDD e o número." });
  }
  const lista = existsSync(ARQUIVO_EMAILS) ? JSON.parse(readFileSync(ARQUIVO_EMAILS, "utf-8")) : {};
  lista[endereco] ??= { quando: new Date().toISOString(), origem: typeof origem === "string" ? origem.slice(0, 20) : "site" };
  if (numero) lista[endereco].whatsapp ||= numero;
  writeFileSync(ARQUIVO_EMAILS, JSON.stringify(lista, null, 1));
  return json(res, 200, { ok: true });
}

function arquivo(req, res, url) {
  const pedido = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let caminho = join(SITE, pedido);
  if (!caminho.startsWith(SITE)) return json(res, 403, { motivo: "Caminho inválido." });
  if (!existsSync(caminho) || statSync(caminho).isDirectory()) {
    if (pedido.startsWith("/dados/")) return json(res, 404, { motivo: "Não encontrado." });
    caminho = join(SITE, "index.html");
  }
  if (!existsSync(caminho)) return json(res, 500, { motivo: "Rode npm run build antes." });
  const tipo = TIPOS[extname(caminho)] ?? "application/octet-stream";
  const cabecalho = { "content-type": tipo };
  if (pedido.startsWith("/assets/")) cabecalho["cache-control"] = "public, max-age=31536000, immutable";
  const comprimir = /json|javascript|css|html|svg/.test(tipo) && /gzip/.test(req.headers["accept-encoding"] ?? "");
  if (comprimir) {
    res.writeHead(200, { ...cabecalho, "content-encoding": "gzip", vary: "accept-encoding" });
    createReadStream(caminho).pipe(createGzip()).pipe(res);
  } else {
    res.writeHead(200, cabecalho);
    createReadStream(caminho).pipe(res);
  }
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/api/marcas") {
    api(req, res, url).catch(() => json(res, 500, { motivo: "Erro no servidor." }));
    return;
  }
  if (url.pathname === "/api/email") {
    email(req, res).catch(() => json(res, 500, { motivo: "Erro no servidor." }));
    return;
  }
  arquivo(req, res, url);
}).listen(PORTA, () => {
  console.log(`Onde posso conversar: http://localhost:${PORTA}${LIBERAR ? " (janela liberada para teste)" : ""}`);
});
