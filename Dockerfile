# Use the official Node.js image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
