include env_make
NS = mjacoby
VERSION ?= latest

REPO = streamup
NAME = streamup-current
INSTANCE = default

.PHONY: build push shell run start stop rm release

build:
	sudo docker build -t $(NS)/$(REPO):$(VERSION) .

push:
	sudo docker push $(NS)/$(REPO):$(VERSION)

shell:
	sudo docker run --rm -it --name $(NAME)-$(INSTANCE) -i -t $(PORTS) $(VOLUMES) $(NS)/$(REPO):$(VERSION) /bin/bash

run:
	sudo docker run --rm -it --name $(NAME)-$(INSTANCE) $(PORTS) $(VOLUMES) $(NS)/$(REPO):$(VERSION)

start:
	sudo docker run -d --name $(NAME)-$(INSTANCE) $(PORTS) $(VOLUMES) $(NS)/$(REPO):$(VERSION)

stop:
	sudo docker stop $(NAME)-$(INSTANCE)

rm:
	sudo docker rm $(NAME)-$(INSTANCE)

release: build
	make push -e VERSION=$(VERSION)

default: build