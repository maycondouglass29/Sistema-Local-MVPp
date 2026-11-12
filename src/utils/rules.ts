import {
  Student,
  AttendanceEvent,
  EventType,
} from '../types/database';

export interface ScanRuleInput {
  student: Student;
  requestedType: EventType;
  lastEventsToday: AttendanceEvent[];
  currentTime: Date;
  duplicityWindowSeconds?: number;
}

export interface ScanRuleResult {
  allowed: boolean;
  alertType: 'success' | 'warning' | 'denied' | 'duplicate';
  message: string;
}

/**
 * Validates attendance scan business rules according to PRD RF-01, RF-02, RF-04:
 * 1. Status 'inactive' or 'blocked' -> denied
 * 2. Duplicity check: same QR scanned within duplicityWindowSeconds (default 60s) -> duplicate alert
 * 3. Exit coherence: warning if exit registered without prior entry or already exited
 */
export function evaluateScanRules(input: ScanRuleInput): ScanRuleResult {
  const {
    student,
    requestedType,
    lastEventsToday,
    currentTime,
    duplicityWindowSeconds = 60,
  } = input;

  // 1. Check Student status
  if (student.status === 'blocked') {
    return {
      allowed: false,
      alertType: 'denied',
      message: `Acesso Bloqueado: ${student.block_reason || 'Favor contatar a coordenação pedagógica'}`,
    };
  }

  if (student.status === 'inactive' || student.status === 'graduated') {
    return {
      allowed: false,
      alertType: 'denied',
      message: `Acesso Negado: Aluno(a) com matrícula ${student.status === 'inactive' ? 'Inativa' : 'Concluída'}`,
    };
  }

  // 2. Duplicity check within window (e.g. 60 seconds)
  const lastEvent = lastEventsToday.length > 0 ? lastEventsToday[0] : null;

  if (lastEvent) {
    const lastEventTime = new Date(lastEvent.occurred_at_device).getTime();
    const elapsedSeconds = Math.floor((currentTime.getTime() - lastEventTime) / 1000);

    if (elapsedSeconds >= 0 && elapsedSeconds < duplicityWindowSeconds) {
      return {
        allowed: false,
        alertType: 'duplicate',
        message: `Leitura Duplicada: Carteirinha já validada há ${elapsedSeconds}s. Aguarde ${duplicityWindowSeconds - elapsedSeconds}s para nova leitura.`,
      };
    }
  }

  // 3. Entry / Exit Coherence (RF-02)
  if (requestedType === 'exit') {
    const hasEntryToday = lastEventsToday.some(
      (e) => e.event_type === 'entry' && (!e.correction_of_id)
    );
    const lastNonCorrection = lastEventsToday.find((e) => !e.correction_of_id);

    if (!hasEntryToday) {
      return {
        allowed: true,
        alertType: 'warning',
        message: 'Atenção: Saída sem registro prévio de entrada hoje. Requer verificação do operador.',
      };
    }

    if (lastNonCorrection && lastNonCorrection.event_type === 'exit') {
      return {
        allowed: true,
        alertType: 'warning',
        message: 'Atenção: Aluno já possui registro de saída recente. Confirmar saída adicional.',
      };
    }
  }

  if (requestedType === 'entry') {
    const lastNonCorrection = lastEventsToday.find((e) => !e.correction_of_id);
    if (lastNonCorrection && lastNonCorrection.event_type === 'entry') {
      return {
        allowed: true,
        alertType: 'warning',
        message: 'Atenção: Aluno já possui entrada registrada hoje. Confirmar reentrada.',
      };
    }
  }

  return {
    allowed: true,
    alertType: 'success',
    message: requestedType === 'entry' ? 'Entrada Liberada' : 'Saída Registrada com Sucesso',
  };
}

export interface CsvStudentValidationResult {
  valid: boolean;
  parsedRow?: {
    enrollment_code: string;
    full_name: string;
    class_name: string;
    guardian_name?: string;
    guardian_phone?: string;
  };
  error?: string;
}

/**
 * Validates a single CSV row for bulk student import (RF-07)
 * Expected columns: matricula, nome, turma, [responsavel, telefone]
 */
export function validateCsvStudentRow(
  columns: string[],
  existingEnrollmentCodes: Set<string>
): CsvStudentValidationResult {
  if (columns.length < 3) {
    return {
      valid: false,
      error: 'Linha incompleta: requer ao menos Matrícula, Nome e Turma.',
    };
  }

  const enrollment_code = columns[0]?.trim();
  const full_name = columns[1]?.trim();
  const class_name = columns[2]?.trim();
  const guardian_name = columns[3]?.trim() || '';
  const guardian_phone = columns[4]?.trim() || '';

  if (!enrollment_code) {
    return { valid: false, error: 'Matrícula não pode estar vazia.' };
  }

  if (!full_name || full_name.length < 3) {
    return { valid: false, error: 'Nome inválido ou menor que 3 caracteres.' };
  }

  if (!class_name) {
    return { valid: false, error: 'Turma não informada.' };
  }

  if (existingEnrollmentCodes.has(enrollment_code.toLowerCase())) {
    return {
      valid: false,
      error: `Matrícula '${enrollment_code}' já cadastrada no sistema.`,
    };
  }

  return {
    valid: true,
    parsedRow: {
      enrollment_code,
      full_name,
      class_name,
      guardian_name,
      guardian_phone,
    },
  };
}

/**
 * Validates a non-destructive correction request (RF-05)
 */
export function validateCorrection(
  originalEvent: AttendanceEvent | undefined,
  reason: string,
  operatorId: string
): { valid: boolean; error?: string } {
  if (!originalEvent) {
    return { valid: false, error: 'Evento original não encontrado.' };
  }
  if (!operatorId) {
    return { valid: false, error: 'Identificação do operador é obrigatória.' };
  }
  if (!reason || reason.trim().length < 8) {
    return {
      valid: false,
      error: 'A justificativa de correção deve ter no mínimo 8 caracteres.',
    };
  }
  return { valid: true };
}

export interface ReportFilterCriteria {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  classId?: string;
  eventType?: string; // 'all' | 'entry' | 'exit' | 'correction'
  searchQuery?: string;
}

export interface ReportSummaryStats {
  totalRecords: number;
  totalEntries: number;
  totalExits: number;
  totalCorrections: number;
  uniqueStudentsCount: number;
}

/**
 * Pure filter for attendance reporting by date interval, class, event type, and search query.
 */
export function filterAttendanceEvents(
  events: AttendanceEvent[],
  students: Student[],
  criteria: ReportFilterCriteria
): AttendanceEvent[] {
  const { startDate, endDate, classId, eventType = 'all', searchQuery = '' } = criteria;
  const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));

  const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
  const queryLower = searchQuery.toLowerCase().trim();

  return events.filter((ev) => {
    // 1. Date Range
    const eventTime = new Date(ev.occurred_at_device).getTime();
    if (startMs !== null && !isNaN(startMs) && eventTime < startMs) {
      return false;
    }
    if (endMs !== null && !isNaN(endMs) && eventTime > endMs) {
      return false;
    }

    // 2. Event Type
    if (eventType !== 'all' && ev.event_type !== eventType) {
      return false;
    }

    // 3. Class Filter
    const student = studentMap.get(ev.student_id);
    if (classId && classId !== 'all') {
      if (!student || student.class_id !== classId) {
        return false;
      }
    }

    // 4. Search Query
    if (queryLower) {
      const matchName = student?.full_name.toLowerCase().includes(queryLower) ?? false;
      const matchEnrollment = student?.enrollment_code.toLowerCase().includes(queryLower) ?? false;
      const matchId = ev.id.toLowerCase().includes(queryLower);
      const matchReason = ev.correction_reason?.toLowerCase().includes(queryLower) ?? false;
      if (!matchName && !matchEnrollment && !matchId && !matchReason) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes aggregated statistics for the filtered report.
 */
export function calculateReportSummary(events: AttendanceEvent[]): ReportSummaryStats {
  const uniqueStudents = new Set<string>();
  let totalEntries = 0;
  let totalExits = 0;
  let totalCorrections = 0;

  events.forEach((ev) => {
    uniqueStudents.add(ev.student_id);
    if (ev.event_type === 'entry') totalEntries++;
    else if (ev.event_type === 'exit') totalExits++;
    else if (ev.event_type === 'correction') totalCorrections++;
  });

  return {
    totalRecords: events.length,
    totalEntries,
    totalExits,
    totalCorrections,
    uniqueStudentsCount: uniqueStudents.size,
  };
}

