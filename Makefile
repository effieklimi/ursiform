.PHONY: up build test clean install up-cloud up-cloud-local dev-cloud

install:
	npm install

# Local development with Docker Qdrant
up:
	docker compose up --build

# Cloud development with Docker (requires Docker)
up-cloud:
	docker compose -f docker-compose.cloud.yml up --build

# Cloud development without Docker (direct Node.js)
up-cloud-local:
	npm run build && npm start

# Development mode for cloud (with hot reload)
dev-cloud:
	npm run dev-cloud

build:
	tsc && docker build -t backend .

test:
	npm test

clean:
	docker compose down
	docker system prune -f

clean-cloud:
	docker compose -f docker-compose.cloud.yml down

dev:
	npm run dev 