FROM node:24.2.0-alpine

# Set the working directory inside the container at _build_ time
WORKDIR /app

# Copy the package.json files so that we can do the install note this is done before everything else
# so that caching can take place and we don't reinstall everything every time
COPY package*.json ./

# Then do the install
RUN npm install

# Then copy the application files
COPY . .



# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "devStart"]