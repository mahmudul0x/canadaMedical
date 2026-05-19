FROM node:20-slim

WORKDIR /app

# Install bun
RUN npm install -g bun

# Install dependencies (copy lockfile variants — bun uses bun.lock or bun.lockb)
COPY package.json bun.lock* bun.lockb* ./
RUN bun install

# Copy source
COPY . .

EXPOSE 8080

CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
