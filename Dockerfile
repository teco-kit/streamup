FROM node:0.10
MAINTAINER Michael Jacoby <michael_jacoby@hotmail.com>

RUN apt-get update

RUN npm install -g supervisor

# Install supervisor for startup script management
RUN apt-get install -y supervisor
RUN service supervisor restart

# Supervisor init config
ADD supervisor.conf /etc/supervisor.conf

# StreamUp supervisor script
ADD streamup-servers.conf /etc/supervisor/conf.d/streamup-servers.conf

WORKDIR /usr/src/app

EXPOSE 8080 8081
CMD ["supervisord", "-c", "/etc/supervisor.conf"]

