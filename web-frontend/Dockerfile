FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Named volume for node_modules starts empty — install on boot, then run Vite.
CMD ["sh", "-c", "npm ci && npm run dev -- --host 0.0.0.0 --port 3000"]
