import { SqlDatabase } from '../db/connection';

export interface ContextMemoryRecord {
  id: string;
  entity_type: 'student' | 'guardian' | 'school_rule';
  entity_id: string;
  category: 'custody' | 'temporary_pickup' | 'authorized_pickup' | 'health_medical' | 'behavioral' | 'general';
  content: string;
  metadata_json?: string;
  importance_score: number; // 1 to 5
  is_active: number; // 1 or 0
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export class MemoryRepository {
  constructor(private db: SqlDatabase) {}

  getMemoriesForEntity(entityId: string, entityType = 'student'): ContextMemoryRecord[] {
    return this.db
      .query<ContextMemoryRecord>(
        `SELECT * FROM context_memories 
         WHERE entity_id = ? AND entity_type = ? AND is_active = 1
         ORDER BY importance_score DESC, created_at DESC`
      )
      .all(entityId, entityType);
  }

  getHighPriorityMemories(studentId: string): ContextMemoryRecord[] {
    return this.db
      .query<ContextMemoryRecord>(
        `SELECT * FROM context_memories 
         WHERE entity_id = ? AND is_active = 1 AND importance_score >= 4
         ORDER BY importance_score DESC, created_at DESC`
      )
      .all(studentId);
  }

  addMemory(memory: Omit<ContextMemoryRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }): ContextMemoryRecord {
    const now = new Date().toISOString();
    const id = memory.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    this.db.run(
      `INSERT INTO context_memories (id, entity_type, entity_id, category, content, metadata_json, importance_score, is_active, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      memory.entity_type,
      memory.entity_id,
      memory.category,
      memory.content,
      memory.metadata_json || null,
      memory.importance_score || 3,
      memory.is_active !== undefined ? memory.is_active : 1,
      memory.expires_at || null,
      now,
      now
    );

    return this.getById(id)!;
  }

  getById(id: string): ContextMemoryRecord | undefined {
    return this.db.query<ContextMemoryRecord>('SELECT * FROM context_memories WHERE id = ?').get(id);
  }

  searchMemories(query: string): ContextMemoryRecord[] {
    return this.db
      .query<ContextMemoryRecord>(
        `SELECT * FROM context_memories 
         WHERE content LIKE ? AND is_active = 1
         ORDER BY importance_score DESC, created_at DESC`
      )
      .all(`%${query}%`);
  }

  listAll(): ContextMemoryRecord[] {
    return this.db
      .query<ContextMemoryRecord>('SELECT * FROM context_memories ORDER BY importance_score DESC, created_at DESC')
      .all();
  }
}

