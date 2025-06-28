FROM node:24.2.0-alpine AS build-stage

# Set the working directory inside the container at _build_ time
WORKDIR /app

# Copy the package.json files so that we can do the install note this is done before everything else
# so that caching can take place and we don't reinstall everything every time
COPY package*.json ./

# Then do the install
RUN npm install

# Then copy the application files
COPY . .




RUN npm run build

# Step 2: Serve the Vue.js app with Nginx
FROM node:24.2.0-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]