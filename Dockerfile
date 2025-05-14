# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app

# Stage 2: Builder image
FROM base AS builder

# Copy package.json and yarn.lock and install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN yarn build

# Stage 3: Production image
FROM base AS prod

WORKDIR /app

COPY --from=builder /app/.env ./.env

# Copy the built app from the builder image
COPY --from=builder /app/dist ./dist

# Copy the package.json and yarn.lock for production
COPY --from=builder /app/package*.json ./

# Copy node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Expose the port and set the environment variable
EXPOSE 3000
ENV PORT 3000

# Run the application
CMD ["node", "dist/main.js"]

# Command run
# docker build -f docker/Dockerfile -t my-image .
# docker run -p 8001:8000 my-image