# Breakroom

With Docker, in the terminal:

docker build -t breakroom:latest .

docker run --name breakroom -p 80:80 breakroom:latest

docker stop breakroom

docker rm breakroom

To Docker Hub:

docker build -t dallascaley/breakroom:latest <- not sure what this is but it doesn't work

docker push dallascaley/breakroom:latest <- do this to actually push to docker hub

----  Note's post addition of docker-compose  ----

This is how you run dev:

docker-compose up --build

# This uses docker-compose.yml and docker-compose.override.yml file

This is how you run production:

docker-compose -f docker-compose.yml up --build

# This skips the override file - you get a clean production image and container with
# no volumes or dev commands

Not implemented yet:

# Environment files, can be assigned in the docker-compose files like so

env_file: .env.development

# 5/17/2025  This is exactly how you start working on this code locally (as of this date)

1) open this file in Visual Studio Code
2) Open powershell, CD to this directory: cd .\Repo\Breakroom\  (assuming you have it set up just like me)
3) Start Docker Desktop (minimize this shit)
4) docker-compose up --build 

At this point you can see if you go to localhost the site.  I think this is all you need to get working but we shall see.

Note, there is a database element to this, but I don't recall if i have it working yet.   Testing a post from the signup page results in a 404 currently so that's obviusly not a good thing.

Ok... As a test, i put a console.log into the signup form post, right before the post. I saved it, reloaded the page and for whatever reason I can't see that console log in the console, so that tells me that this is not a proper development environment.  I should not have to fuckign build every time i make a code change.

That said, lets see if building this again actually makes the change happen...

ok, Ctrl-C'ing the powershell session and doing docker-compose up --build again got my changes to come through
