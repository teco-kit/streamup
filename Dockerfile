FROM node:0.10
MAINTAINER Michael Jacoby <michael_jacoby@hotmail.com>

RUN apt-get update

# install sudo
RUN apt-get install sudo

RUN npm install -g supervisor

# Install supervisor for startup script management
RUN apt-get install -y supervisor
RUN service supervisor restart

# Install browserify
RUN npm install -g browserify

# Install linklocal for linking local node dependencies
RUN npm install -g linklocal

# Supervisor init config
ADD conf/supervisor.conf /etc/supervisor.conf

# StreamUp supervisor script
ADD conf/streamup-servers.conf /etc/supervisor/conf.d/streamup-servers.conf

WORKDIR /usr/src/app

EXPOSE 8080 8081
CMD ["/bin/bash", "startup.sh"]

