import {
  SearchQuery,
  SearchResult,
  UpsertResult,
  CollectionConfig,
  CollectionInfo,
} from "../entities/types";

export interface Vector {
  id: string;
  embedding: number[];
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IVectorRepository {
  search(collection: string, query: SearchQuery): Promise<SearchResult>;
  upsert(collection: string, vectors: Vector[]): Promise<UpsertResult>;
  delete(collection: string, ids: string[]): Promise<boolean>;
  createCollection(name: string, config: CollectionConfig): Promise<void>;
  getCollections(): Promise<CollectionInfo[]>;
  getCollection(name: string): Promise<CollectionInfo>;
  deleteCollection(name: string): Promise<boolean>;
  testConnection(): Promise<boolean>;
}
