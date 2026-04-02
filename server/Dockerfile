FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma/ prisma/
RUN npx prisma generate
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
