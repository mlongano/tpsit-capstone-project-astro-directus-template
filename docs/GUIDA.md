# Guida allo sviluppo

> Template Directus + Astro

---

## Panoramica

Questo template fornisce un ambiente di sviluppo pre-configurato per costruire applicazioni web con Directus come backend e Astro come frontend.

| Servizio       | URL                    | Scopo                                        |
| -------------- | ---------------------- | -------------------------------------------- |
| Directus       | http://localhost:8055  | Backend — API REST e pannello di gestione     |
| Swagger UI     | http://localhost:8010  | Documentazione interattiva delle API          |
| Astro          | http://localhost:4321  | Frontend — da avviare separatamente            |

---

## Prerequisiti

- **Docker Desktop** (o Docker Engine + Docker Compose v2 su Linux)
- **Git**
- Un editor di codice (VS Code consigliato)

> Node.js non è necessario sulla macchina host: il frontend gira in un container Docker con Node 22.

Verifica:

```bash
docker --version          # Docker version 27.x o superiore
docker compose version    # Docker Compose version v2.x
git --version
```

---

## Setup iniziale

### 1. Clona e configura

```bash
git clone <url-del-repo> il-mio-progetto
cd il-mio-progetto
cp .env.example .env
```

Il file `.env` contiene le variabili già configurate con valori di sviluppo:

| Variabile | Default | Descrizione |
| --------- | ------- | ----------- |
| `SECRET` | `dev-secret-...` | Chiave per i token JWT (ok per dev) |
| `ADMIN_EMAIL` | `admin@example.com` | Email admin |
| `ADMIN_PASSWORD` | `admin123` | Password admin |
| `DIRECTUS_ADMIN_TOKEN` | `dev-admin-static-token` | Token per Swagger e API |

Per il development puoi usare i valori di default senza modifiche.
In produzione cambia almeno `SECRET` e le credenziali admin.

### 2. Avvia i container

```bash
docker compose up -d
```

Al primo avvio Docker scarica le immagini (~500 MB). Le volte successive è immediato.

Verifica che Directus sia pronto:

```bash
docker compose ps
```

Quando lo stato di `directus` è `healthy` il sistema è operativo.

### 3. Esegui lo script di setup

```bash
node scripts/setup.mjs
```

Lo script esegue automaticamente:

1. Attende che Directus sia pronto
2. Configura il token statico sull'utente admin
3. Crea la collezione singleton `homepage` con i campi di esempio
4. Inserisce il contenuto iniziale
5. Configura i permessi di lettura pubblica

### 4. Verifica

Apri nel browser:

- http://localhost:4321 — il frontend Astro con il contenuto della homepage
- http://localhost:8055 — il pannello Directus (accedi con `ADMIN_EMAIL` / `ADMIN_PASSWORD` dal `.env`)
- http://localhost:8010 — Swagger UI con la documentazione delle API

Da questo momento puoi modificare i file in `frontend/src/` con il tuo editor: il browser si aggiorna automaticamente grazie all'hot-reload.

---

## Lavorare con Directus

### Accesso al pannello

Apri http://localhost:8055 e accedi con `admin@example.com` / `admin123`.

Il pannello è l'interfaccia dove si gestiscono i dati: creare collezioni, definire campi, inserire contenuti, configurare permessi.

### Creare una nuova collezione

1. Nel pannello Directus, clicca **Settings** (icona ingranaggio) → **Data Model**
2. Clicca **Create Collection**
3. Scegli un nome (es: `articoli`, `prodotti`, `eventi`)
4. Aggiungi i campi necessari (testo, numero, immagine, relazione, ecc.)
5. Salva

La collezione è disponibile via API (richiede autenticazione o permessi pubblici, vedi sezione "Permessi"):

```
GET  http://localhost:8055/items/articoli
POST http://localhost:8055/items/articoli
```

### Tipi di campo più comuni

| Tipo         | Interfaccia Directus     | Uso                             |
| ------------ | ------------------------ | ------------------------------- |
| Testo breve  | Input                    | Titoli, nomi, codici            |
| Testo lungo  | Textarea / Rich Text MD  | Descrizioni, contenuti          |
| Numero       | Input (integer/float)    | Quantità, prezzi, ordinamento   |
| Booleano     | Toggle                   | Flag sì/no                      |
| Data         | Datetime                 | Date di pubblicazione, scadenze |
| Immagine     | File Image               | Foto, logo, illustrazioni       |
| Selezione    | Dropdown                 | Stati, categorie, tipi          |
| Relazione    | Many to One / Many to Many | Collegamento tra collezioni   |

### Singleton vs. collezione normale

- **Singleton**: un solo record, usato per contenuti unici (impostazioni sito, homepage, pagina "chi siamo"). Nel template, `homepage` è un singleton.
- **Collezione normale**: molti record, usata per liste di elementi (articoli, prodotti, eventi).

### Permessi

Per rendere una collezione leggibile dal frontend (senza autenticazione):

1. **Settings** → **Access Policies** → **Public**
2. Aggiungi una regola per la collezione con azione **Read**
3. In **Field Permissions** seleziona quali campi sono visibili
4. Salva

---

## Consumare le API in Astro

### Il client Directus

Il file `frontend/src/lib/directus.ts` contiene il client pre-configurato. Per aggiungere nuove collezioni, estendi l'interfaccia `Schema`:

```typescript
// frontend/src/lib/directus.ts

export interface Articolo {
  id: number;
  titolo: string;
  contenuto: string;
  stato: string;
  data_pubblicazione: string;
}

export interface Schema {
  homepage: Homepage;       // singleton
  articoli: Articolo[];     // collezione normale (array)
}
```

### Leggere dati nelle pagine Astro

```astro
---
// src/pages/articoli/index.astro

import Base from "../../layouts/Base.astro";
import { directus } from "../../lib/directus";
import { readItems } from "@directus/sdk";

const articoli = await directus.request(
  readItems("articoli", {
    filter: { stato: { _eq: "pubblicato" } },
    sort: ["-data_pubblicazione"],
    fields: ["id", "titolo", "data_pubblicazione"],
  })
);
---

<Base title="Articoli">
  <h1>Articoli</h1>
  <ul>
    {articoli.map((a) => (
      <li>
        <a href={`/articoli/${a.id}`}>{a.titolo}</a>
      </li>
    ))}
  </ul>
</Base>
```

### Pagine dinamiche con parametri

```astro
---
// src/pages/articoli/[id].astro

import Base from "../../layouts/Base.astro";
import { directus } from "../../lib/directus";
import { readItem } from "@directus/sdk";

const { id } = Astro.params;
const articolo = await directus.request(readItem("articoli", id));
---

<Base title={articolo.titolo}>
  <h1>{articolo.titolo}</h1>
  <div set:html={articolo.contenuto} />
</Base>
```

### Funzioni SDK principali

| Funzione          | Uso                              | Esempio                                          |
| ----------------- | -------------------------------- | ------------------------------------------------ |
| `readItems`       | Lista di record                  | `readItems("articoli", { limit: 10 })`           |
| `readItem`        | Singolo record per ID            | `readItem("articoli", 5)`                        |
| `readSingleton`   | Record singleton                 | `readSingleton("homepage")`                      |

### Parametri di query comuni

```typescript
readItems("articoli", {
  // Campi da restituire (riduce il payload)
  fields: ["id", "titolo", "autore.nome"],

  // Filtri
  filter: {
    stato: { _eq: "pubblicato" },
    data_pubblicazione: { _lte: "$NOW" },
  },

  // Ordinamento (prefisso - per discendente)
  sort: ["-data_pubblicazione"],

  // Paginazione
  limit: 10,
  offset: 0,

  // Relazioni annidate
  deep: {
    commenti: { _limit: 5 },
  },
});
```

### Gestione errori

La pagina `index.astro` del template mostra il pattern consigliato: wrappare la chiamata in un `try/catch` e mostrare un messaggio utile se Directus non è raggiungibile.

---

## Usare Swagger UI

Swagger UI è accessibile su http://localhost:8010 e mostra tutti gli endpoint REST di Directus, compresi quelli delle collezioni custom.

### Struttura degli endpoint

```
GET    /items/{collezione}          → lista record
GET    /items/{collezione}/{id}     → singolo record
POST   /items/{collezione}          → crea record
PATCH  /items/{collezione}/{id}     → modifica record
DELETE /items/{collezione}/{id}     → elimina record
```

### Provare le API ("Try it out")

1. Espandi un endpoint (es. `GET /items/homepage`)
2. Clicca **Try it out**
3. Compila i parametri se necessario
4. Clicca **Execute**
5. Esamina la risposta JSON

### Autenticazione in Swagger

L'autenticazione è automatica: il token admin viene letto dalla variabile
`DIRECTUS_ADMIN_TOKEN` nel file `.env` e iniettato in tutte le richieste.

Non è necessario cliccare il pulsante Authorize — funziona già di default.

### Limitazioni sui filtri

Swagger UI ha un problema noto con il formato filtri di Directus. Se un filtro
genera errori, prova:

- Usare **Postman** o **Insomnia** per testare query con filtri complessi
- O usa il pannello Directus (http://localhost:8055/admin) per filtrare i dati

### Query utili

**Leggere il singleton homepage:**

```
GET /items/homepage
```

**Filtrare per campo:**

```
GET /items/articoli?filter[stato][_eq]=pubblicato
```

**Selezionare solo alcuni campi:**

```
GET /items/articoli?fields=id,titolo,data_pubblicazione
```

**Includere relazioni:**

```
GET /items/articoli?fields=*,autore.nome
```

> Documentazione completa dei filtri: [Directus Filter Rules](https://docs.directus.io/reference/filter-rules.html)

---

## Comandi di riferimento

### Docker

```bash
docker compose up -d              # Avvia tutto (Directus + Frontend + Swagger)
docker compose down               # Ferma tutto (i dati persistono)
docker compose logs -f directus   # Log Directus in tempo reale
docker compose logs -f frontend   # Log Frontend in tempo reale
docker compose ps                 # Stato dei container
```

### Dopo modifiche a package.json

Se aggiungi una nuova dipendenza npm al frontend, il container deve essere ricostruito:

```bash
docker compose up -d --build frontend
```

### Reset completo

Se il database è corrotto o si vuole ripartire da zero:

```bash
docker compose down -v            # Ferma e rimuove i volumi (incluso node_modules)
rm backend/database/data.db
docker compose up -d --build
node scripts/setup.mjs
```

---

## Risoluzione problemi

### Swagger UI mostra "Failed to load API definition"

Directus non è ancora pronto. Verifica:

```bash
docker compose ps    # Lo stato di directus deve essere "healthy"
```

Se non è healthy, controlla i log: `docker compose logs directus`

### Swagger mostra solo endpoint di sistema (auth, server, users)

Il token admin non è configurato. Eseguire `node scripts/setup.mjs` e poi riavviare Swagger: `docker compose restart swagger-ui`

### Il frontend mostra "Directus non raggiungibile"

1. Verifica che i container siano avviati: `docker compose ps`
2. Verifica di aver eseguito lo script di setup: `node scripts/setup.mjs`
3. Controlla i log del frontend: `docker compose logs frontend`

### "CORS error" nel browser

Verifica che nel `.env` radice siano presenti le variabili CORS (sono già nel `.env.example`). Dopo modifiche al `.env`, riavvia: `docker compose up -d`

### Errore "permission denied" sulle API

La collezione non ha permessi di lettura pubblica. Vai in Directus → Settings → Access Policies → Public e aggiungi il permesso di lettura per la collezione.

### Porta già occupata

Modifica il mapping nel `compose.yml`:

```yaml
ports:
  - "9055:8055"    # Directus su localhost:9055
```

Aggiorna di conseguenza l'URL di Swagger e la variabile `PUBLIC_DIRECTUS_URL` nel `frontend/.env.example`.

### Le modifiche ai file non si vedono nel browser

L'hot-reload usa il polling per rilevare i cambiamenti (necessario con Docker). Se non funziona:

1. Verifica che il container frontend sia avviato: `docker compose ps`
2. Controlla i log: `docker compose logs -f frontend`
3. Prova a riavviare: `docker compose restart frontend`

### Ho aggiunto una dipendenza npm ma non funziona

Dopo aver modificato `package.json`, il container va ricostruito:

```bash
docker compose up -d --build frontend
```

### `node scripts/setup.mjs` fallisce

Lo script richiede Node.js 22+ (per il supporto nativo di `fetch`). Se non hai Node.js sull'host, puoi eseguirlo dentro il container:

```bash
docker compose exec frontend node /app/scripts/setup.mjs
```

Nota: in questo caso lo script deve raggiungere Directus a `http://directus:8055` (rete Docker interna). Potrebbe essere necessario modificare temporaneamente l'URL nello script.
