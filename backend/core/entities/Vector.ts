import { VectorPayload, VectorMetadata } from "./types";

export class Vector {
  constructor(
    public readonly id: string,
    public readonly embedding: number[],
    public readonly payload: VectorPayload,
    public readonly metadata?: VectorMetadata
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error("Vector ID cannot be empty");
    }

    if (!this.embedding || this.embedding.length === 0) {
      throw new Error("Vector embedding cannot be empty");
    }

    if (
      !this.embedding.every((val) => typeof val === "number" && !isNaN(val))
    ) {
      throw new Error("Vector embedding must contain only valid numbers");
    }

    if (!this.payload || typeof this.payload !== "object") {
      throw new Error("Vector payload must be an object");
    }
  }

  static fromRaw(raw: any): Vector {
    return new Vector(
      raw.id,
      raw.embedding || raw.vector,
      raw.payload || {},
      raw.metadata
    );
  }

  getDimension(): number {
    return this.embedding.length;
  }

  getMagnitude(): number {
    return Math.sqrt(this.embedding.reduce((sum, val) => sum + val * val, 0));
  }

  toJSON(): any {
    return {
      id: this.id,
      embedding: this.embedding,
      payload: this.payload,
      metadata: this.metadata,
    };
  }
}
