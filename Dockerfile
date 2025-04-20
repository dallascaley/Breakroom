# ---------------------------------------
# Stage 1: Build Vue frontend
# ---------------------------------------
  FROM node:20-alpine AS frontend

  WORKDIR /frontend
  
  # Install frontend dependencies
  COPY frontend/package*.json ./
  RUN npm install
  
  # Copy frontend source and build it
  COPY frontend/ .
  RUN npm run build
  
  # Debug: list contents of dist to confirm build succeeded
  RUN echo "==== Frontend build complete. Contents of /frontend/dist ====" && ls -la /frontend/dist
  
  # ---------------------------------------
  # Stage 2: Setup backend + serve frontend
  # ---------------------------------------
  FROM node:20-alpine AS backend
  
  WORKDIR /app
  
  # Install backend dependencies
  COPY backend/package*.json ./
  RUN npm install
  
  # Install nodemon
  RUN npm install -g nodemon
  
  # Copy backend source
  COPY backend/ .
  
  # Copy built frontend into backend's public directory
  COPY --from=frontend /frontend/dist ./public
  
  # Debug: list contents of /app/public to confirm index.html exists
  RUN echo "==== Contents of /app/public (should include index.html) ====" && ls -la ./public
  
  EXPOSE 80
  
  # Start the server
  # CMD ["node", "index.js"]  # original setup
  CMD ["npm", "run", "dev"]
  