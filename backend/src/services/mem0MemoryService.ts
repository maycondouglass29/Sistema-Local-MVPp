import { MemoryRepository, ContextMemoryRecord } from '../repositories/memoryRepository';

export interface StudentContextPayload {
  studentId: string;
  criticalAlerts: ContextMemoryRecord[];
  authorizedPickups: ContextMemoryRecord[];
  generalNotes: ContextMemoryRecord[];
  totalMemoriesCount: number;
}

export class Mem0MemoryService {
  constructor(private memoryRepo: MemoryRepository) {}

  getContextForStudent(studentId: string): StudentContextPayload {
    const allMemories = this.memoryRepo.getMemoriesForEntity(studentId, 'student');

    const criticalAlerts: ContextMemoryRecord[] = [];
    const authorizedPickups: ContextMemoryRecord[] = [];
    const generalNotes: ContextMemoryRecord[] = [];

    for (const mem of allMemories) {
      if (mem.category === 'health_medical' || mem.category === 'custody') {
        criticalAlerts.push(mem);
      } else if (mem.category === 'temporary_pickup' || mem.category === 'authorized_pickup') {
        authorizedPickups.push(mem);
      } else if (mem.importance_score >= 4) {
        criticalAlerts.push(mem);
      } else {
        generalNotes.push(mem);
      }
    }

    return {
      studentId,
      criticalAlerts,
      authorizedPickups,
      generalNotes,
      totalMemoriesCount: allMemories.length,
    };
  }

  saveMemory(data: {
    studentId: string;
    category: ContextMemoryRecord['category'];
    content: string;
    importance?: number;
    expiresAt?: string;
  }): ContextMemoryRecord {
    return this.memoryRepo.addMemory({
      entity_type: 'student',
      entity_id: data.studentId,
      category: data.category,
      content: data.content,
      importance_score: data.importance || 3,
      expires_at: data.expiresAt,
      is_active: 1,
    });
  }

  searchMemories(query: string): ContextMemoryRecord[] {
    return this.memoryRepo.searchMemories(query);
  }

  listAll(): ContextMemoryRecord[] {
    return this.memoryRepo.listAll();
  }
}

