include env_make
NS = mjacoby
VERSION ?= latest

REPO = streamup
NAME = streamup-current
INSTANCE = default

.PHONY: build push shell run start stop rm release

build:
	docker build -t $(NS)/$(REPO):$(VERSION) .

push:
	docker push $(NS)/$(REPO):$(VERSION)

shell:
	docker run --rm -it --name $(NAME)-$(INSTANCE) -i -t $(PORTS) $(VOLUMES) $(NS)/$(REPO):$(VERSION) /bin/bash

browserify: 
	docker run --rm -it --name $(NAME)-$(INSTANCE) -i -t $(PORTS) $(VOLUMES) $(NS)/$(REPO):$(VERSION) browserify streamup/src/index.js --standalone StreamUp > streamup/bin/StreamUp.standalone.js 
	docker run --rm -it --name $(NAME)-$(INSTANCE) -i -t $(PORTS) $(VOLUMES) $(NS)/$(REPO):$(VERSION) browserify streamup-server-teco/src/SmartTecoOntology.js --standalone SmartTecoOntology > streamup-server-teco/bin/SmartTecoOntology.standalone.js 

run:
	docker run --rm -it --name $(NAME)-$(INSTANCE) $(PORTS) $(VOLUMES) $(NS)/$(REPO):$(VERSION)

start:
	docker run -d --name $(NAME)-$(INSTANCE) $(PORTS) $(VOLUMES) $(NS)/$(REPO):$(VERSION)

stop:
	docker stop $(NAME)-$(INSTANCE)

rm:
	docker rm $(NAME)-$(INSTANCE)

release: build
	make push -e VERSION=$(VERSION)


default: build	
