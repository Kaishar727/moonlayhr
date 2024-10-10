# Frontend Dockerfile (in the /moonlayhr directory)
FROM node:18-alpine

# Set work directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the Vite app for production
RUN npm run build

# Expose port 5173
EXPOSE 5173

# Command to run the app
CMD ["npm", "run", "dev"]
