FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 gymmate

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

USER gymmate

EXPOSE 4000

CMD ["node", "dist/index.js"]
