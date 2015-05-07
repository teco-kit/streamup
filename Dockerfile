FROM node:0.10
MAINTAINER Michael Jacoby <michael_jacoby@hotmail.com>

RUN npm install supervisor -g

WORKDIR /usr/src/app

EXPOSE 8080
CMD ["npm", "start"]

