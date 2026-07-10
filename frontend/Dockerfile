FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies (use ci for deterministic lockfile-exact install)
RUN npm ci

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run development server exposed on host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
