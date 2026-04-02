/**
 * Client Directus per il frontend Astro.
 *
 * Usa l'SDK modulare di Directus con il composable `rest()`.
 * Il client è configurato senza autenticazione: legge solo i dati
 * pubblici esposti dai permessi del ruolo "Public" in Directus.
 *
 * Uso nelle pagine Astro:
 *   import { directus } from "../lib/directus";
 *   import { readSingleton, readItems } from "@directus/sdk";
 *
 *   const homepage = await directus.request(readSingleton("homepage"));
 */

import { createDirectus, rest } from "@directus/sdk";

// ── Tipi ─────────────────────────────────────────────────────
// Definisci qui i tipi delle tue collezioni Directus.
// Questo abilita l'autocompletamento e il type-checking.

export interface Homepage {
  titolo_sito: string;
  sottotitolo: string;
  descrizione: string;
  immagine_hero: string | null;
}

export interface Schema {
  homepage: Homepage; // singleton (oggetto, non array)
}

// ── Client ───────────────────────────────────────────────────

// URL per le chiamate API server-side (dentro il container Docker
// è "http://directus:8055", in locale è "http://localhost:8055")
const directusUrl = import.meta.env.DIRECTUS_URL || "http://localhost:8055";

// URL per i riferimenti nel browser (immagini, link).
// Il browser dell'utente non può raggiungere "directus:8055",
// quindi serve sempre l'URL esterno.
export const directusPublicUrl =
  import.meta.env.PUBLIC_DIRECTUS_URL || "http://localhost:8055";

export const directus = createDirectus<Schema>(directusUrl).with(rest());

/**
 * Costruisce l'URL pubblico di un asset Directus (immagine, file).
 * Usare nei tag <img> e <a> per garantire che il browser possa
 * raggiungere il file.
 *
 * Esempio:
 *   <img src={assetUrl(homepage.immagine_hero)} />
 */
export function assetUrl(fileId: string | null): string | undefined {
  if (!fileId) return undefined;
  return `${directusPublicUrl}/assets/${fileId}`;
}
