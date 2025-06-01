import { VectorPayload, CollectionConfig } from "./types";

export class Collection {
  constructor(
    public readonly name: string,
    public readonly dimension: number,
    public readonly vectorCount: number,
    public readonly schema: VectorPayload,
    public readonly config?: CollectionConfig
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error("Collection name cannot be empty");
    }

    if (this.dimension <= 0 || this.dimension > 65536) {
      throw new Error("Collection dimension must be between 1 and 65536");
    }

    if (this.vectorCount < 0) {
      throw new Error("Vector count cannot be negative");
    }
  }

  static fromQdrantInfo(info: any): Collection {
    return new Collection(
      info.name || "unknown",
      info.config?.params?.vectors?.size || 0,
      info.vectors_count || 0,
      {},
      {
        dimension: info.config?.params?.vectors?.size || 0,
        distance: info.config?.params?.vectors?.distance || "Cosine",
      }
    );
  }

  isEmpty(): boolean {
    return this.vectorCount === 0;
  }

  getStatus(): string {
    if (this.isEmpty()) return "empty";
    if (this.vectorCount < 100) return "small";
    if (this.vectorCount < 10000) return "medium";
    return "large";
  }

  toJSON(): any {
    return {
      name: this.name,
      dimension: this.dimension,
      vectorCount: this.vectorCount,
      status: this.getStatus(),
      config: this.config,
    };
  }
}
