FROM node:22-alpine

WORKDIR /app

# Copia package.json e installa dipendenze.
# Questo layer è cachato finché package.json non cambia.
COPY package.json ./
RUN npm install

# Il codice sorgente viene montato come volume (non copiato).
# Il CMD avvia il dev server in ascolto su tutte le interfacce
# (necessario per l'accesso dall'esterno del container).
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
