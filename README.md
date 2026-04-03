# Template Directus + Astro

Boilerplate per progetti web con [Directus](https://directus.io) come backend headless e [Astro](https://astro.build) come frontend SSR.

## Cosa include

- **Directus 11** su SQLite (zero configurazione database)
- **Swagger UI** per esplorare e testare le API
- **Astro 6** con client Directus SDK già configurato
- Collezione singleton `homepage` di esempio con permessi pubblici
- Script di setup automatico

## Prerequisiti

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Compose v2 su Linux)

> Node.js non è necessario sulla macchina host: il frontend gira in un container.

## Avvio rapido

```bash
# 1. Clona e configura
git clone <url-del-repo> il-mio-progetto
cd il-mio-progetto
cp .env.example .env

# 2. Avvia tutto (Directus + Frontend + Swagger)
docker compose up -d

# 3. Setup iniziale (una sola volta)
node scripts/setup.mjs
```

> Lo script `setup.mjs` richiede Node.js 18+. Puoi eseguirlo dall'host o dentro il container:
>
> `docker compose exec -e DIRECTUS_ADMIN_TOKEN -e ADMIN_EMAIL -e ADMIN_PASSWORD frontend node /app/scripts/setup.mjs`

Apri nel browser:

| Servizio   | URL                   |
| ---------- | --------------------- |
| Frontend   | http://localhost:4321 |
| Directus   | http://localhost:8055 |
| Swagger UI | http://localhost:8010 |

Credenziali admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (vedi `.env`)

## Struttura del progetto

```
├── compose.yml              Docker Compose (Directus + Frontend + Swagger)
├── .env.example             Variabili d'ambiente
├── scripts/
│   └── setup.mjs            Setup iniziale (token, schema, seed)
├── backend/
│   ├── database/            Database SQLite (generato al primo avvio)
│   ├── uploads/             File caricati in Directus
│   └── extensions/          Estensioni Directus custom
├── frontend/
│   ├── Dockerfile           Container Node 22 + Astro dev server
│   ├── astro.config.mjs
│   ├── src/
│   │   ├── lib/directus.ts  Client API tipizzato
│   │   ├── layouts/         Layout Astro
│   │   ├── pages/           Pagine del sito
│   │   ├── components/      Componenti riutilizzabili
│   │   └── styles/          CSS globale
│   └── .env.example
└── docs/
    └── GUIDA.md             Guida completa per lo sviluppo
```

## Come funziona

1. **Directus** espone API REST automatiche per ogni collezione creata
2. **Astro** interroga le API lato server e produce HTML
3. **Swagger UI** documenta le API e permette di testarle dal browser

Il template include una collezione singleton `homepage` come esempio. Modifica i campi in Directus, ricarica la pagina Astro, vedi i cambiamenti. Le modifiche ai file in `frontend/src/` si riflettono automaticamente nel browser grazie all'hot-reload.

## Prossimi passi

Consulta la [guida completa](docs/GUIDA.md) per:

- Creare nuove collezioni in Directus
- Consumare le API nelle pagine Astro
- Usare Swagger per esplorare gli endpoint
- Aggiungere autenticazione e ruoli custom

## Comandi utili

```bash
docker compose up -d              # Avvia tutto
docker compose down               # Ferma tutto
docker compose logs -f            # Log in tempo reale
docker compose logs -f frontend   # Log solo del frontend

# Dopo modifiche a package.json (nuove dipendenze)
docker compose up -d --build frontend
```

## Reset

```bash
docker compose down -v            # Ferma e rimuove i volumi (incluso node_modules)
rm backend/database/data.db
docker compose up -d --build
node scripts/setup.mjs
```
