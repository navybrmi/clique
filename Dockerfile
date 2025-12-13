# Runtime Dockerfile for running Clique locally (and in prod-like mode)
# Uses a simple build-then-start flow (no standalone output required).

FROM node:20-bookworm-slim

WORKDIR /app

# Prisma requires OpenSSL in slim images; pg_isready is used to wait for Postgres.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy Prisma schema before install so postinstall (prisma generate) can succeed.
COPY prisma ./prisma
COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Avoid running tests during Docker builds; this is for runtime.
RUN npm run build:docker

EXPOSE 3000

CMD ["sh", "-c", "until pg_isready -h db -p 5432 -U postgres >/dev/null 2>&1; do echo 'Waiting for db...'; sleep 1; done; npx prisma migrate deploy; npm run start -- -p 3000 -H 0.0.0.0"]
