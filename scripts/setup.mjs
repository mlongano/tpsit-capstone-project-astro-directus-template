#!/usr/bin/env node

/**
 * Setup iniziale del template Directus + Astro.
 *
 * Eseguire UNA SOLA VOLTA dopo il primo `docker compose up -d`.
 * Lo script:
 *   1. Autentica come admin e ottiene un token temporaneo
 *   2. Configura il token statico sul profilo admin
 *   3. Crea la collezione singleton "homepage"
 *   4. Inserisce il contenuto iniziale della homepage
 *
 * Uso:
 *   node scripts/setup.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Configurazione ───────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

// Legge il .env dalla radice del progetto, o usa variabili d'ambiente
function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  const env = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    // usa variabili d'ambiente se .env non trovato
  }
  return env;
}

const env = loadEnv();

// Use Docker network URL if running inside container, otherwise localhost
const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_TOKEN = env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_ADMIN_TOKEN || "dev-admin-static-token";

// ── Helpers ──────────────────────────────────────────────────

async function waitForDirectus(maxAttempts = 30) {
  console.log("⏳ Attendo che Directus sia pronto...");
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${DIRECTUS_URL}/server/health`);
      if (res.ok) {
        console.log("✅ Directus è pronto\n");
        return;
      }
    } catch {
      // Directus non ancora raggiungibile
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error("❌ Directus non raggiungibile dopo 60 secondi. Verificare che i container siano avviati.");
  process.exit(1);
}

async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }

  // Alcune risposte sono vuote (204)
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }
  return null;
}

// ── Step 1: Autenticazione ───────────────────────────────────

async function authenticate() {
  console.log("🔑 Autenticazione come admin...");
  const { data } = await api("POST", "/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  console.log("✅ Autenticazione riuscita\n");
  return data.access_token;
}

// ── Step 2: Token statico admin ──────────────────────────────

async function setupAdminToken(accessToken) {
  console.log("🔧 Configurazione token statico admin...");

  // Recupera l'ID dell'utente admin
  const { data: users } = await api(
    "GET",
    `/users?filter[email][_eq]=${ADMIN_EMAIL}&fields=id`,
    null,
    accessToken
  );

  if (!users.length) {
    throw new Error(`Utente ${ADMIN_EMAIL} non trovato`);
  }

  const adminId = users[0].id;

  // Imposta il token statico
  await api("PATCH", `/users/${adminId}`, { token: ADMIN_TOKEN }, accessToken);
  console.log(`✅ Token statico configurato: ${ADMIN_TOKEN}\n`);
}

// ── Step 3: Collezione singleton "homepage" ──────────────────

async function createHomepageCollection(accessToken) {
  console.log("📦 Creazione collezione homepage...");

  // Verifica se la collezione esiste già
  let collectionExists = false;
  try {
    await api("GET", "/collections/homepage", null, accessToken);
    collectionExists = true;
  } catch {
    // Non esiste
  }

  if (!collectionExists) {
    // Crea la collezione come singleton
    await api(
      "POST",
      "/collections",
      {
        collection: "homepage",
        meta: {
          singleton: true,
          icon: "home",
          note: "Contenuto della homepage del sito",
          sort: 1,
        },
        schema: {
          name: "homepage",
        },
      },
      accessToken
    );
  } else {
    console.log("ℹ️  La collezione homepage esiste già\n");
  }

  // Crea i campi (anche se la collezione esiste già)
  const fields = [
    {
      field: "titolo_sito",
      type: "string",
      meta: {
        interface: "input",
        sort: 1,
        width: "full",
        note: "Titolo principale mostrato nell'hero della homepage",
      },
      schema: { default_value: "Il Nostro Progetto" },
    },
    {
      field: "sottotitolo",
      type: "string",
      meta: {
        interface: "input",
        sort: 2,
        width: "full",
        note: "Sottotitolo o tagline sotto il titolo principale",
      },
      schema: { default_value: "Una breve descrizione del progetto" },
    },
    {
      field: "descrizione",
      type: "text",
      meta: {
        interface: "input-rich-text-md",
        sort: 3,
        width: "full",
        note: "Testo di presentazione in formato Markdown",
      },
      schema: {
        default_value:
          "Benvenuti nel nostro sito. Questo contenuto è gestito tramite **Directus** e renderizzato con **Astro**.",
      },
    },
    {
      field: "immagine_hero",
      type: "uuid",
      meta: {
        special: ["file"],
        interface: "file-image",
        display: "image",
        sort: 5,
        width: "full",
      },
      schema: {
        data_type: "char",
        max_length: 36,
        is_nullable: true,
        foreign_key_table: "directus_files",
        foreign_key_column: "id",
      },
    },
  ];

  for (const field of fields) {
    try {
      await api("POST", `/fields/homepage`, field, accessToken);
    } catch {
      // Campo già esiste
    }
  }

  // Crea la relazione per il campo immagine (file-image)
  try {
    await api("POST", "/relations", {
      collection: "homepage",
      field: "immagine_hero",
      related_collection: "directus_files",
      meta: {
        many_collection: "homepage",
        many_field: "immagine_hero",
        one_collection: "directus_files",
        one_deselect_action: "nullify",
      },
      schema: {
        on_update: "NO ACTION",
        on_delete: "SET NULL",
      },
    }, accessToken);
  } catch {
    // Relazione già esiste
  }

  console.log("✅ Collezione homepage creata con campi: titolo_sito, sottotitolo, descrizione, immagine_hero\n");
}

// ── Step 4: Contenuto iniziale ───────────────────────────────

async function seedHomepageContent(accessToken) {
  console.log("📝 Inserimento contenuto iniziale homepage...");

  const homepageContent = {
    titolo_sito: "Il Nostro Progetto",
    sottotitolo: "Una breve descrizione del progetto",
    descrizione: `# Benvenuti nel nostro sito!

Questo contenuto è scritto in **Markdown** e viene renderizzato automaticamente dal frontend.

## Caratteristiche principali

- Markup leggibile e portabile
- Convertibile in HTML, PDF, ePub
- Ideale per contenuti CMS

### Formattazione inline

Puoi usare il **grassetto**, il *corsivo*, o anche \`codice inline\` per termini tecnici.

### Liste

1. Primo elemento della lista
2. Secondo elemento
3. Terzo elemento

> Le citazioni vengono stilizzate con una barra laterale colorata.

### Codice

\`\`\`javascript
const saluto = "Ciao, mondo!";
console.log(saluto);
\`\`\`

---

*Prova a modificare questo contenuto in Directus!*`,
  };

  // Verifica se il contenuto esiste già
  try {
    const { data } = await api("GET", "/items/homepage", null, accessToken);
    if (data) {
      // Usa PATCH per aggiornare il contenuto esistente
      await api("PATCH", "/items/homepage", homepageContent, accessToken);
      console.log("✅ Contenuto homepage aggiornato\n");
      return;
    }
  } catch {
    // Non esiste, lo creiamo
  }

  await api("POST", "/items/homepage", homepageContent, accessToken);
  console.log("✅ Contenuto homepage inserito\n");
}

// ── Step 5: Permessi pubblici ────────────────────────────────

async function setupPublicPermissions(accessToken) {
  console.log("🔓 Configurazione permessi pubblici...");

  // Recupera la policy pubblica
  const { data: policies } = await api(
    "GET",
    "/policies?filter[name][_eq]=$t:public_label&fields=id",
    null,
    accessToken
  );

  if (!policies.length) {
    console.log("⚠️  Policy pubblica non trovata, salto i permessi\n");
    return;
  }

  const publicPolicyId = policies[0].id;

  // Permesso lettura homepage (singleton)
  await api(
    "POST",
    "/permissions",
    {
      policy: publicPolicyId,
      collection: "homepage",
      action: "read",
      fields: ["*"],
    },
    accessToken
  );

  // Permesso lettura file pubblici (per immagine_hero)
  try {
    await api(
      "POST",
      "/permissions",
      {
        policy: publicPolicyId,
        collection: "directus_files",
        action: "read",
        fields: ["*"],
      },
      accessToken
    );
  } catch {
    // Potrebbe già esistere
    console.log("ℹ️  Permesso lettura file probabilmente già presente");
  }

  console.log("✅ Permessi pubblici configurati: lettura homepage e file\n");
}

// ── Step 6: Configurazione progetto ─────────────────────────

async function setupProjectSettings(accessToken) {
  console.log("⚙️  Configurazione progetto Directus...");

  await api(
    "PATCH",
    "/settings",
    {
      project_owner: ADMIN_EMAIL,
      org_name: "Template Project",
    },
    accessToken
  );

  console.log("✅ Progetto configurato: owner e org_name\n");
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  Setup Template Directus + Astro             ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await waitForDirectus();

  const accessToken = await authenticate();
  await setupAdminToken(accessToken);
  await createHomepageCollection(accessToken);
  await seedHomepageContent(accessToken);
  await setupPublicPermissions(accessToken);
  await setupProjectSettings(accessToken);

  console.log("════════════════════════════════════════════════");
  console.log("  Setup completato!");
  console.log("");
  console.log("  Frontend:    http://localhost:4321");
  console.log("  Directus:    http://localhost:8055");
  console.log(`               ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("");
  console.log("  Swagger UI:  http://localhost:8010");
  console.log("════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n❌ Errore durante il setup:", err.message);
  process.exit(1);
});
