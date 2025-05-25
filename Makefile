.PHONY: up build test clean install

install:
	yarn install

up:
	docker-compose up --build

build:
	tsc && docker build -t backend .

test:
	yarn test

clean:
	docker-compose down
	docker system prune -f

dev:
	yarn dev 