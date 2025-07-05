# Step 1: Build Vue app
FROM node:24.2.0-alpine

# Set working dir
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy everything else
COPY . .

# The following two commands are only used if the container is run independently.  If it is run via docker-compose
# then these are both overridden.  I am leaving them in here in case in the future we have a front end and back end
# team separately working on the project

# Expose the dev port
EXPOSE 5173

# Start Vite dev server
CMD ["npm", "run", "dev"]
