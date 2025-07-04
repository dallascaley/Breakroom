# Step 1: Build Vue app
FROM node:24.2.0-alpine

# Set working dir
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy everything else
COPY . .

# Expose the dev port
EXPOSE 5173

# Start Vite dev server
CMD ["npm", "run", "dev"]
