import { Injectable, Inject } from '@nestjs/common';
import { Db, Collection, Filter } from 'mongodb';
import { Pet } from '../pets.service';
import { MONGODB_CONNECTION_TOKEN } from '../../database/database.constants';

const PETS_COLLECTION = 'pets';
const EXPLAIN_MODE = 'executionStats';
const BREED_FIELD = 'breed';
const RETURN_DOCUMENT = 'after' as const;

@Injectable()
export class PetsRepository {
  private collection: Collection<Pet>;

  constructor(@Inject(MONGODB_CONNECTION_TOKEN) private db: Db) {
    this.collection = this.db.collection<Pet>(PETS_COLLECTION);
  }

  async create(pet: Pet): Promise<Pet> {
    const result = await this.collection.insertOne(pet);
    return { ...pet, _id: pet._id || result.insertedId.toString() } as Pet;
  }

  async findById(id: string): Promise<Pet | null> {
    const result = await this.collection.findOne({ _id: id as any });
    return result as Pet | null;
  }

  async update(id: string, updateData: Partial<Pet>): Promise<Pet | null> {
    const { _id, ...data } = updateData;
    const result = await this.collection.findOneAndUpdate(
      { _id: id as any },
      { $set: data },
      { returnDocument: RETURN_DOCUMENT },
    );
    return result as unknown as Pet;
  }

  async findAll(query: Filter<Pet>, skip?: number, limit?: number, sort?: any): Promise<Pet[]> {
    let cursor = this.collection.find(query);
    if (sort) cursor = cursor.sort(sort);
    if (skip !== undefined) cursor = cursor.skip(skip);
    if (limit !== undefined) cursor = cursor.limit(limit);
    return cursor.toArray();
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.collection.aggregate(pipeline).toArray();
  }

  async count(query: Filter<Pet>): Promise<number> {
    return this.collection.countDocuments(query);
  }

  async explain(query: Filter<Pet>): Promise<any> {
    return this.collection.find(query).explain(EXPLAIN_MODE);
  }

  async explainAggregation(pipeline: any[]): Promise<any> {
    return this.collection.aggregate(pipeline).explain(EXPLAIN_MODE);
  }

  async distinctBreeds(): Promise<string[]> {
    return this.collection.distinct(BREED_FIELD);
  }
}
