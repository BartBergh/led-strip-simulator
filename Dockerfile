# Use the official Node.js 14 image.
FROM node:14

# Set the working directory in the container to /usr/src/app.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to work directory.
COPY package*.json ./

# Install npm dependencies.
RUN npm install

# Copy the current directory contents into the container at /usr/src/app.
COPY . .

# Make port 3000 available to the world outside this container.
EXPOSE 3000

# Run the app when the container launches.
CMD ["npm", "start"]
