.PHONY: up build test clean install up-cloud

install:
	yarn install

up:
	docker-compose up --build

up-cloud:
	docker-compose -f docker-compose.cloud.yml up --build

build:
	tsc && docker build -t backend .

test:
	yarn test

clean:
	docker-compose down
	docker system prune -f

clean-cloud:
	docker-compose -f docker-compose.cloud.yml down

dev:
	yarn dev 