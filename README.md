# Breakroom

With Docker, in the terminal:

docker build -t breakroom:latest .

docker run --name breakroom -p 80:80 breakroom:latest

docker stop breakroom

docker rm breakroom