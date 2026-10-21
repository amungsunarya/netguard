# ============================================
# Stage 1: Build React
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# SELALU pakai npm install (bukan npm ci)
RUN npm install

# Copy source
COPY . .

# Build
RUN npm run build

# ============================================
# Stage 2: Serve dengan Nginx
# ============================================
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]