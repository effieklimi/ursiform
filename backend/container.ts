import { IVectorRepository } from "./core/interfaces/IVectorRepository";
import { IEmbeddingService } from "./core/interfaces/IEmbeddingService";
import { INLPService } from "./core/interfaces/INLPService";

import { QdrantVectorRepository } from "./infrastructure/qdrant/QdrantVectorRepository";
import { EmbeddingService } from "./services/EmbeddingService";
import { NLPService } from "./services/NLPService";
import { VectorSearchService } from "./services/VectorSearchService";
import { VectorController } from "./api/VectorController";

// Simple dependency injection container
class Container {
  private instances = new Map<string, any>();

  register<T>(key: string, factory: () => T): void {
    this.instances.set(key, factory);
  }

  get<T>(key: string): T {
    const factory = this.instances.get(key);
    if (!factory) {
      throw new Error(`No factory registered for key: ${key}`);
    }
    return factory();
  }
}

// Create container instance
const container = new Container();

// Register dependencies
container.register<IVectorRepository>(
  "vectorRepository",
  () => new QdrantVectorRepository()
);
container.register<IEmbeddingService>(
  "embeddingService",
  () => new EmbeddingService()
);
container.register<INLPService>("nlpService", () => new NLPService());

container.register<VectorSearchService>(
  "vectorSearchService",
  () =>
    new VectorSearchService(
      container.get<IVectorRepository>("vectorRepository"),
      container.get<IEmbeddingService>("embeddingService")
    )
);

container.register<VectorController>(
  "vectorController",
  () =>
    new VectorController(
      container.get<VectorSearchService>("vectorSearchService"),
      container.get<INLPService>("nlpService")
    )
);

export { container };
