/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  RotateCcw,
  ShieldCheck,
  Search,
  Check,
  Clock,
  QrCode,
  Scissors,
  Eye,
  Layers,
  CheckCheck,
  RefreshCw,
  X,
  CheckCircle2,
  Settings2,
  FileDown,
  Sparkles,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { Student } from '../types/database';

export type BadgeFormat = 'cr80' | 'cr80_vertical' | 'badge_90x60' | 'badge_100x70' | 'custom';
export type A4Density = '8_per_page' | '10_per_page';
export type PrintDestination = 'pvc_card' | 'a4_single' | 'a4_batch';

export const BadgesStudioView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [printStatusFilter, setPrintStatusFilter] = useState<'all' | 'pending' | 'printed'>('all');
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<{ [studentId: string]: string }>({});

  // Layout & Dimension Configuration
  const [badgeFormat, setBadgeFormat] = useState<BadgeFormat>('cr80');
  const [customWidthMm, setCustomWidthMm] = useState<number>(85.6);
  const [customHeightMm, setCustomHeightMm] = useState<number>(54.0);
  const [layoutMode, setLayoutMode] = useState<'individual' | 'a4_batch'>('individual');
  const [printDestination, setPrintDestination] = useState<PrintDestination>('pvc_card');
  const [a4Density, setA4Density] = useState<A4Density>('8_per_page');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);

  // Selection for Batch Printing / Export
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);

  // Messages & Modals
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [showConfirmPrintedModal, setShowConfirmPrintedModal] = useState<boolean>(false);

  const classrooms = localDb.getClassrooms();

  const loadData = () => {
    const list = localDb.getStudents();
    setStudents(list);
    if (!selectedStudentId && list.length > 0) {
      setSelectedStudentId(list[0].id);
    }
  };

  useEffect(() => {
    loadData();
    return localDb.subscribe(loadData);
  }, []);

  // Generate QR Codes for all students
  useEffect(() => {
    const generateAllQrs = async () => {
      const urls: { [id: string]: string } = {};
      for (const s of students) {
        const ident = localDb.getActiveIdentifier(s.id);
        const tokenToEncode = ident ? ident.raw_token : `school_horizonte_01:student:${s.id}:v1`;
        try {
          const url = await QRCode.toDataURL(tokenToEncode, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 320,
            color: {
              dark: '#111827',
              light: '#ffffff',
            },
          });
          urls[s.id] = url;
        } catch {
          // ignore
        }
      }
      setQrCodeDataUrls(urls);
    };

    if (students.length > 0) {
      generateAllQrs();
    }
  }, [students]);

  // Filter students based on search, classroom, and print status
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.full_name.toLowerCase().includes(query) ||
        s.enrollment_code.toLowerCase().includes(query);
      const matchesClass = classFilter === 'all' || s.class_id === classFilter;
      const matchesPrintStatus =
        printStatusFilter === 'all' ||
        (printStatusFilter === 'pending' && !s.badge_printed_at) ||
        (printStatusFilter === 'printed' && !!s.badge_printed_at);

      return matchesSearch && matchesClass && matchesPrintStatus;
    });
  }, [students, searchQuery, classFilter, printStatusFilter]);

  const pendingStudents = students.filter((s) => !s.badge_printed_at);
  const printedStudents = students.filter((s) => !!s.badge_printed_at);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) || filteredStudents[0] || students[0];
  const selectedIdentifier = selectedStudent
    ? localDb.getActiveIdentifier(selectedStudent.id)
    : null;
  const selectedClass = selectedStudent
    ? classrooms.find((c) => c.id === selectedStudent.class_id)
    : null;

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Dimensions & CSS styling helper
  const getBadgeDimensions = () => {
    switch (badgeFormat) {
      case 'cr80_vertical':
        return {
          width: '53.98mm',
          height: '85.60mm',
          widthMm: 53.98,
          heightMm: 85.60,
          isVertical: true,
          label: 'Crachá Vertical (54×85.6mm) - Furo Ovoide',
        };
      case 'badge_90x60':
        return {
          width: '90.00mm',
          height: '60.00mm',
          widthMm: 90.0,
          heightMm: 60.0,
          isVertical: false,
          label: 'Crachá Papel Médio (90×60mm) - Bolsa Plástica',
        };
      case 'badge_100x70':
        return {
          width: '70.00mm',
          height: '100.00mm',
          widthMm: 70.0,
          heightMm: 100.0,
          isVertical: true,
          label: 'Crachá Grande Vertical (70×100mm) - Credencial',
        };
      case 'custom':
        return {
          width: `${customWidthMm}mm`,
          height: `${customHeightMm}mm`,
          widthMm: customWidthMm,
          heightMm: customHeightMm,
          isVertical: customHeightMm > customWidthMm,
          label: `Manual (${customWidthMm}×${customHeightMm}mm)`,
        };
      case 'cr80':
      default:
        return {
          width: '85.60mm',
          height: '53.98mm',
          widthMm: 85.6,
          heightMm: 53.98,
          isVertical: false,
          label: 'Cartão PVC Padrão CR-80 (85.60×53.98mm)',
        };
    }
  };

  const badgeDims = getBadgeDimensions();

  // Selection Helpers
  const handleToggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedStudentIds);
    filteredStudents.forEach((s) => next.add(s.id));
    setSelectedStudentIds(next);
  };

  const handleSelectAllPending = () => {
    const next = new Set(selectedStudentIds);
    pendingStudents.forEach((s) => next.add(s.id));
    setSelectedStudentIds(next);
    showNotification(`${pendingStudents.length} carteirinha(s) pendentes selecionadas.`);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const handleReissueBadge = () => {
    if (!selectedStudent) return;
    localDb.revokeAndReissueToken(selectedStudent.id);
    showNotification(
      `Nova credencial emitida para ${selectedStudent.full_name}. Token anterior revogado e carteirinha marcada como pendente.`
    );
    setShowRevokeModal(false);
  };

  const handlePrint = () => {
    if (layoutMode === 'individual') {
      window.print();
      setShowConfirmPrintedModal(true);
    } else {
      if (selectedStudentIds.size === 0) {
        handleSelectAllFiltered();
      }
      setTimeout(() => {
        window.print();
        setShowConfirmPrintedModal(true);
      }, 100);
    }
  };

  const handleConfirmMarkAsPrinted = () => {
    const idsToMark =
      layoutMode === 'individual' && selectedStudent
        ? [selectedStudent.id]
        : Array.from(selectedStudentIds);

    if (idsToMark.length > 0) {
      localDb.markBadgesAsPrinted(idsToMark);
      showNotification(`${idsToMark.length} carteirinha(s) marcadas como impressas com sucesso.`);
    }
    setShowConfirmPrintedModal(false);
  };

  const handleMarkSelectedAsPrinted = () => {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return;
    localDb.markBadgesAsPrinted(ids);
    showNotification(`${ids.length} carteirinha(s) marcadas como impressas.`);
  };

  const handleMarkSelectedAsPending = () => {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return;
    ids.forEach((id) => localDb.markBadgeAsPending(id));
    showNotification(`${ids.length} carteirinha(s) marcadas como pendentes de impressão.`);
  };

  // Group selected students into A4 sheets (chunks of 8 or 10)
  const studentsToPrintInBatch =
    selectedStudentIds.size > 0
      ? students.filter((s) => selectedStudentIds.has(s.id))
      : filteredStudents;

  const pageSize = a4Density === '8_per_page' ? 8 : 10;
  const chunkedA4Pages: Student[][] = [];
  for (let i = 0; i < studentsToPrintInBatch.length; i += pageSize) {
    chunkedA4Pages.push(studentsToPrintInBatch.slice(i, i + pageSize));
  }

  // ── High Resolution (300 DPI) Canvas PNG Exporter ──
  const generateBadgeCanvas = async (student: Student): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    const dpi = 300;
    const mmToPx = dpi / 25.4; // ~11.811 pixels per mm

    const widthPx = Math.round(badgeDims.widthMm * mmToPx);
    const heightPx = Math.round(badgeDims.heightMm * mmToPx);
    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Background: Crisp white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Outer subtle hairline border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = Math.round(1 * (dpi / 300));
    ctx.strokeRect(0, 0, widthPx, heightPx);

    const pad = Math.round(3.5 * mmToPx);
    const innerW = widthPx - pad * 2;

    const studentClass = classrooms.find((c) => c.id === student.class_id);
    const qrDataUrl = qrCodeDataUrls[student.id];

    if (!badgeDims.isVertical) {
      // ════ HORIZONTAL LAYOUT (CR-80 / 90×60mm) ════
      // 1. Header
      const headerH = Math.round(10 * mmToPx);

      // Logo Icon box
      const logoBoxSize = Math.round(8 * mmToPx);
      ctx.fillStyle = '#142024';
      ctx.beginPath();
      ctx.roundRect(pad, pad, logoBoxSize, logoBoxSize, Math.round(1.5 * mmToPx));
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(4 * mmToPx)}px 'Montserrat', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EH', pad + logoBoxSize / 2, pad + logoBoxSize / 2);

      // Title & Subtitle
      ctx.textAlign = 'left';
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${Math.round(3.6 * mmToPx)}px 'Montserrat', sans-serif`;
      ctx.fillText('Escola Horizonte', pad + logoBoxSize + Math.round(2 * mmToPx), pad + Math.round(3 * mmToPx));

      ctx.fillStyle = '#6b7280';
      ctx.font = `${Math.round(2.4 * mmToPx)}px 'Courier New', monospace`;
      ctx.fillText('Carteirinha de Acesso', pad + logoBoxSize + Math.round(2 * mmToPx), pad + Math.round(6.5 * mmToPx));

      // Right Pill Badge: ESTUDANTE
      const pillW = Math.round(22 * mmToPx);
      const pillH = Math.round(5 * mmToPx);
      const pillX = widthPx - pad - pillW;
      const pillY = pad + Math.round(1.5 * mmToPx);

      ctx.fillStyle = '#f3f4f6';
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, Math.round(1 * mmToPx));
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.font = `bold ${Math.round(2.2 * mmToPx)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ESTUDANTE', pillX + pillW / 2, pillY + pillH / 2);

      // Divider
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = Math.round(0.8 * (dpi / 300));
      ctx.beginPath();
      ctx.moveTo(pad, pad + headerH);
      ctx.lineTo(widthPx - pad, pad + headerH);
      ctx.stroke();

      // 2. Middle Body: Photo, Student Info, QR Code
      const bodyY = pad + headerH + Math.round(2 * mmToPx);
      const photoW = Math.round(21 * mmToPx);
      const photoH = Math.round(26 * mmToPx);

      // Draw Photo or fallback
      if (student.photo_ref) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = student.photo_ref;
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
          });
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(pad, bodyY, photoW, photoH, Math.round(1.5 * mmToPx));
          ctx.clip();
          ctx.drawImage(img, pad, bodyY, photoW, photoH);
          ctx.restore();
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 1;
          ctx.strokeRect(pad, bodyY, photoW, photoH);
        } catch {
          // Fallback box
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(pad, bodyY, photoW, photoH);
          ctx.fillStyle = '#6b7280';
          ctx.font = `bold ${Math.round(6 * mmToPx)}px 'Montserrat', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(student.full_name.slice(0, 2).toUpperCase(), pad + photoW / 2, bodyY + photoH / 2);
        }
      } else {
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(pad, bodyY, photoW, photoH);
        ctx.fillStyle = '#6b7280';
        ctx.font = `bold ${Math.round(6 * mmToPx)}px 'Montserrat', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(student.full_name.slice(0, 2).toUpperCase(), pad + photoW / 2, bodyY + photoH / 2);
      }

      // QR Code on Far Right
      const qrSize = Math.round(24 * mmToPx);
      const qrX = widthPx - pad - qrSize;
      const qrY = bodyY;

      if (qrDataUrl) {
        try {
          const qrImg = new Image();
          qrImg.src = qrDataUrl;
          await new Promise((res) => {
            qrImg.onload = res;
          });
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1;
          ctx.strokeRect(qrX, qrY, qrSize, qrSize);

          ctx.fillStyle = '#6b7280';
          ctx.font = `${Math.round(2.0 * mmToPx)}px 'Courier New', monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('TOKEN LGPD', qrX + qrSize / 2, qrY + qrSize + Math.round(2.8 * mmToPx));
        } catch {
          // ignore
        }
      }

      // Student Details (Center Column)
      const textX = pad + photoW + Math.round(3 * mmToPx);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Name
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${Math.round(3.4 * mmToPx)}px 'Montserrat', sans-serif`;
      const displayName = student.full_name.length > 22 ? student.full_name.slice(0, 21) + '…' : student.full_name;
      ctx.fillText(displayName, textX, bodyY + Math.round(1 * mmToPx));

      // Class
      ctx.fillStyle = '#4b5563';
      ctx.font = `${Math.round(2.6 * mmToPx)}px 'Montserrat', sans-serif`;
      ctx.fillText(`Turma: ${studentClass?.name || 'Geral'}`, textX, bodyY + Math.round(6 * mmToPx));

      // Enrollment
      ctx.fillStyle = '#1f2937';
      ctx.font = `bold ${Math.round(2.6 * mmToPx)}px 'Courier New', monospace`;
      ctx.fillText(`Matrícula: ${student.enrollment_code}`, textX, bodyY + Math.round(10.5 * mmToPx));

      // Validity
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${Math.round(2.3 * mmToPx)}px 'Montserrat', sans-serif`;
      ctx.fillText('Validade: 31/12/2026', textX, bodyY + Math.round(15 * mmToPx));

      // 3. Footer Bar
      const footerY = heightPx - pad - Math.round(4 * mmToPx);
      ctx.strokeStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(pad, footerY);
      ctx.lineTo(widthPx - pad, footerY);
      ctx.stroke();

      ctx.fillStyle = '#9ca3af';
      ctx.font = `${Math.round(2.1 * mmToPx)}px 'Courier New', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('Portaria Escolar Local-First', pad, footerY + Math.round(1.5 * mmToPx));

      ctx.textAlign = 'right';
      ctx.fillText('Validação Óptica', widthPx - pad, footerY + Math.round(1.5 * mmToPx));
    } else {
      // ════ VERTICAL LAYOUT (CR-80 Vertical / 70×100mm) ════
      // Header slot hole indicator
      const slotW = Math.round(14 * mmToPx);
      const slotH = Math.round(3 * mmToPx);
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.roundRect(widthPx / 2 - slotW / 2, pad, slotW, slotH, slotH / 2);
      ctx.fill();

      // Logo & Title
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${Math.round(3.4 * mmToPx)}px 'Montserrat', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Escola Horizonte', widthPx / 2, pad + Math.round(7 * mmToPx));

      ctx.fillStyle = '#6b7280';
      ctx.font = `${Math.round(2.2 * mmToPx)}px 'Courier New', monospace`;
      ctx.fillText('CARTEIRINHA DE ACESSO', widthPx / 2, pad + Math.round(11 * mmToPx));

      // Photo
      const photoSize = Math.round(26 * mmToPx);
      const photoX = widthPx / 2 - photoSize / 2;
      const photoY = pad + Math.round(14 * mmToPx);

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(photoX, photoY, photoSize, photoSize);
      ctx.fillStyle = '#6b7280';
      ctx.font = `bold ${Math.round(8 * mmToPx)}px 'Montserrat', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(student.full_name.slice(0, 2).toUpperCase(), photoX + photoSize / 2, photoY + photoSize / 2);

      // Student Info
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${Math.round(3.4 * mmToPx)}px 'Montserrat', sans-serif`;
      ctx.fillText(student.full_name, widthPx / 2, photoY + photoSize + Math.round(2 * mmToPx));

      ctx.fillStyle = '#4b5563';
      ctx.font = `${Math.round(2.6 * mmToPx)}px 'Montserrat', sans-serif`;
      ctx.fillText(`Turma: ${studentClass?.name || 'Geral'}`, widthPx / 2, photoY + photoSize + Math.round(6.5 * mmToPx));

      ctx.fillStyle = '#1f2937';
      ctx.font = `bold ${Math.round(2.6 * mmToPx)}px 'Courier New', monospace`;
      ctx.fillText(`Matrícula: ${student.enrollment_code}`, widthPx / 2, photoY + photoSize + Math.round(10.5 * mmToPx));

      // QR Code
      const qrSize = Math.round(22 * mmToPx);
      const qrX = widthPx / 2 - qrSize / 2;
      const qrY = photoY + photoSize + Math.round(15 * mmToPx);

      if (qrDataUrl) {
        try {
          const qrImg = new Image();
          qrImg.src = qrDataUrl;
          await new Promise((res) => {
            qrImg.onload = res;
          });
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        } catch {
          // ignore
        }
      }

      ctx.fillStyle = '#6b7280';
      ctx.font = `${Math.round(2.0 * mmToPx)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('TOKEN LGPD', widthPx / 2, qrY + qrSize + Math.round(1.5 * mmToPx));

      // Footer
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${Math.round(2.0 * mmToPx)}px 'Courier New', monospace`;
      ctx.fillText('Portaria Escolar Local-First', widthPx / 2, heightPx - pad - Math.round(2 * mmToPx));
    }

    return canvas;
  };

  const handleDownloadSinglePng = async (student: Student) => {
    setIsExportingPng(true);
    try {
      const canvas = await generateBadgeCanvas(student);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeName = student.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        link.download = `carteirinha_${student.enrollment_code}_${safeName}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification(`Carteirinha de "${student.full_name}" baixada em PNG (300 DPI).`);
      }, 'image/png');
    } catch (err) {
      alert('Erro ao gerar imagem da carteirinha: ' + String(err));
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadSelectedBatchPng = async () => {
    const list = selectedStudentIds.size > 0
      ? students.filter((s) => selectedStudentIds.has(s.id))
      : filteredStudents;

    if (list.length === 0) {
      showNotification('Nenhum aluno selecionado para download.');
      return;
    }

    setIsExportingPng(true);
    showNotification(`Iniciando download de ${list.length} carteirinha(s) em alta resolução...`);

    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const canvas = await generateBadgeCanvas(s);
      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const safeName = s.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            link.download = `carteirinha_${s.enrollment_code}_${safeName}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          setTimeout(resolve, 180);
        }, 'image/png');
      });
    }

    setIsExportingPng(false);
    showNotification(`Download de ${list.length} carteirinha(s) concluído com sucesso!`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 select-none animate-in fade-in duration-150">
      {/* ── Dynamic Print Stylesheet calibrated for exact mm proportions ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-badge-root, #printable-badge-root * {
            visibility: visible !important;
          }
          #printable-badge-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: ${
              layoutMode === 'individual'
                ? printDestination === 'pvc_card'
                  ? `${badgeDims.width} ${badgeDims.height}`
                  : 'A4 portrait'
                : 'A4 portrait'
            };
            margin: ${
              layoutMode === 'individual' && printDestination === 'pvc_card'
                ? '0'
                : '0'
            };
          }
          .printable-sheet {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 no-print">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Emissão de Carteirinhas Escolares
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Geração calibrada em milímetros para impressoras térmicas de PVC (CR-80), crachás manuais, folhas de lote A4 e download em alta resolução.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="bg-neutral-100 p-1 rounded-xl inline-flex gap-1 border border-neutral-200 text-xs font-medium">
            <button
              onClick={() => {
                setLayoutMode('individual');
                if (printDestination === 'a4_batch') setPrintDestination('pvc_card');
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'individual'
                  ? 'bg-white text-neutral-900 border border-neutral-300 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>Cartão Individual</span>
            </button>
            <button
              onClick={() => {
                setLayoutMode('a4_batch');
                setPrintDestination('a4_batch');
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'a4_batch'
                  ? 'bg-white text-neutral-900 border border-neutral-300 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Folha A4 em Lote</span>
            </button>
          </div>

          {/* Download PNG Button */}
          {layoutMode === 'individual' && selectedStudent ? (
            <button
              onClick={() => handleDownloadSinglePng(selectedStudent)}
              disabled={isExportingPng}
              className="border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 text-neutral-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              title="Baixar carteirinha em imagem PNG nítida (300 DPI) para envio digital ou confecção externa"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>{isExportingPng ? 'Gerando...' : 'Baixar PNG (300 DPI)'}</span>
            </button>
          ) : (
            <button
              onClick={handleDownloadSelectedBatchPng}
              disabled={isExportingPng}
              className="border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 text-neutral-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              title="Baixar todas as carteirinhas selecionadas em PNG de alta resolução"
            >
              <FileDown className="w-3.5 h-3.5 text-neutral-500" />
              <span>{isExportingPng ? 'Baixando...' : 'Baixar Lote (PNGs)'}</span>
            </button>
          )}

          {/* Master Print Button */}
          <button
            onClick={handlePrint}
            className="bg-[#0f766e] hover:bg-[#0d5f59] active:bg-[#0b4e49] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>
              {layoutMode === 'individual'
                ? 'Imprimir carteirinha'
                : `Imprimir lote (${studentsToPrintInBatch.length})`}
            </span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 no-print shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ── Physical Calibration & Dimension Controls Ribbon ── */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3.5 no-print shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
            <Settings2 className="w-4 h-4 text-[#0f766e]" />
            <span>Calibração Físico-Mecânica &amp; Destino de Confecção</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-neutral-500 font-medium">Formato Físico:</span>
            <select
              value={badgeFormat}
              onChange={(e) => setBadgeFormat(e.target.value as BadgeFormat)}
              className="bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs text-neutral-800 font-medium focus:outline-none focus:border-[#0f766e]"
            >
              <option value="cr80">Cartão PVC Padrão CR-80 (85.60 × 53.98 mm) - Zebra / Evolis / Datacard</option>
              <option value="cr80_vertical">Crachá Vertical Estudantil (54.00 × 85.60 mm) - Furo Ovoide</option>
              <option value="badge_90x60">Crachá Papel Médio (90.00 × 60.00 mm) - Bolsa Plástica</option>
              <option value="badge_100x70">Crachá Grande Vertical (70.00 × 100.00 mm) - Credencial</option>
              <option value="custom">Tamanho Personalizado Manual (mm)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Destination Selector for Individual Layout */}
          {layoutMode === 'individual' ? (
            <div className="space-y-1">
              <label className="text-neutral-600 font-medium">Destino de Impressão:</label>
              <select
                value={printDestination}
                onChange={(e) => setPrintDestination(e.target.value as PrintDestination)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-medium focus:outline-none focus:border-[#0f766e]"
              >
                <option value="pvc_card">Impressora de Cartão PVC (CR-80 Direto / Sem Margem)</option>
                <option value="a4_single">Impressora Comum (Folha A4 com Marcas de Corte)</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-neutral-600 font-medium">Capacidade Folha A4:</label>
              <select
                value={a4Density}
                onChange={(e) => setA4Density(e.target.value as A4Density)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800"
              >
                <option value="8_per_page">8 carteirinhas / folha (2 cols × 4 linhas - recomendado)</option>
                <option value="10_per_page">10 carteirinhas / folha (2 cols × 5 linhas - econômico)</option>
              </select>
            </div>
          )}

          {badgeFormat === 'custom' ? (
            <>
              <div className="space-y-1">
                <label className="text-neutral-600 font-medium">Largura Manual (mm):</label>
                <input
                  type="number"
                  step="0.5"
                  min="40"
                  max="200"
                  value={customWidthMm}
                  onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-600 font-medium">Altura Manual (mm):</label>
                <input
                  type="number"
                  step="0.5"
                  min="30"
                  max="280"
                  value={customHeightMm}
                  onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-900"
                />
              </div>
            </>
          ) : (
            <div className="col-span-2 flex items-center gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-neutral-500">Proporção Calibrada:</span>
              <strong className="text-[#0f766e] font-mono text-xs">{badgeDims.width} × {badgeDims.height}</strong>
              <span className="text-neutral-400 text-[11px]">(Escala 1:1 física &bull; 300 DPI)</span>
            </div>
          )}

          {/* Crop marks switch */}
          <div className="flex items-center gap-2 pt-2 md:pt-4">
            <input
              type="checkbox"
              id="chkCropMarks"
              checked={showCropMarks}
              onChange={(e) => setShowCropMarks(e.target.checked)}
              className="rounded border-neutral-300 text-[#0f766e] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="chkCropMarks" className="text-neutral-700 cursor-pointer flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-neutral-500" />
              <span>Linhas-guia para corte (Crop Marks)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 flex items-start gap-3 text-xs no-print shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-[#0f766e] mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <div className="font-semibold text-neutral-900 text-xs">
            Privacidade por design &amp; Criptografia (LGPD)
          </div>
          <p className="text-neutral-500 leading-relaxed text-xs">
            O QR Code gerado contém exclusivamente um token opaco imutável (<code className="text-[#0f766e] bg-neutral-100 px-1 py-0.2 rounded font-mono tabular-nums">school:student:&lt;uuidv7&gt;</code>) resolvido apenas pelo banco local. Em caso de extravio ou troca de ano letivo, o token é revogado com 1 clique e substituído de forma imediata.
          </p>
        </div>
      </div>

      {/* ── MODE 1: INDIVIDUAL CARD VIEW & REISSUE STUDIO ── */}
      {layoutMode === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start no-print">
          {/* Left: Student Selector List (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col h-[560px] shadow-2xs">
            {/* Filters Bar */}
            <div className="p-3 border-b border-neutral-200 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou matrícula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs text-neutral-700 focus:outline-none"
                >
                  <option value="all">Todas as turmas ({students.length})</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={printStatusFilter}
                  onChange={(e) => setPrintStatusFilter(e.target.value as any)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs text-neutral-700 focus:outline-none"
                >
                  <option value="all">Todos ({students.length})</option>
                  <option value="pending">Pendentes ({pendingStudents.length})</option>
                  <option value="printed">Impressos ({printedStudents.length})</option>
                </select>
              </div>
            </div>

            {/* Student List */}
            <div className="overflow-y-auto flex-1 divide-y divide-neutral-100">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  Nenhum aluno encontrado para os filtros selecionados.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedStudent?.id === s.id;
                  const c = classrooms.find((cl) => cl.id === s.class_id);
                  const isPrinted = !!s.badge_printed_at;

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full p-2.5 text-left flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-100 border-l-3 border-l-[#0f766e]'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            s.photo_ref ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-7 h-7 rounded-md object-cover border border-neutral-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-xs text-neutral-900 truncate">
                            {s.full_name}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
                            {s.enrollment_code} &bull; {c?.name || 'Geral'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPrinted ? (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                            title={`Impressa em: ${new Date(s.badge_printed_at!).toLocaleDateString('pt-BR')}`}
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Impressa</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pendente</span>
                          </span>
                        )}
                        <QrCode className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0f766e]' : 'text-neutral-400'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Individual Badge Preview & Management (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedStudent && (
              <>
                {/* Physical Card Preview Container */}
                <div className="bg-neutral-100 p-6 rounded-xl border border-neutral-200 flex flex-col items-center justify-center space-y-3 shadow-2xs">
                  <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-2">
                    <span>Visualização em Escala Real &bull; {badgeDims.label}</span>
                  </div>

                  {/* Physical Card Visual */}
                  <div
                    id="cr80-card-preview"
                    style={{
                      width: badgeDims.isVertical ? '230px' : '360px',
                      height: badgeDims.isVertical ? '365px' : '226px',
                    }}
                    className="bg-white rounded-xl border border-neutral-300 shadow-md p-4 flex flex-col justify-between relative overflow-hidden select-none transition-all"
                  >
                    {!badgeDims.isVertical ? (
                      /* ── Horizontal Preview ── */
                      <>
                        {/* Header Strip */}
                        <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-[#142024] text-white flex items-center justify-center font-bold text-[10px]">
                              EH
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-neutral-900 tracking-tight">
                                Escola Horizonte
                              </div>
                              <div className="text-[10px] text-neutral-500 font-mono">
                                Carteirinha de Acesso
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono tabular-nums font-semibold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded border border-neutral-200">
                            {badgeFormat === 'cr80' ? 'CR-80 PVC' : 'ESTUDANTE'}
                          </span>
                        </div>

                        {/* Middle: Student Details + QR Code */}
                        <div className="flex items-center justify-between gap-3 py-1">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                selectedStudent.photo_ref ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt=""
                              className="w-16 h-20 rounded-md object-cover border border-neutral-300"
                            />
                            <div className="space-y-0.5">
                              <div className="font-semibold text-xs text-neutral-900 leading-tight">
                                {selectedStudent.full_name}
                              </div>
                              <div className="text-xs text-neutral-500">
                                Turma: <strong className="text-neutral-800">{selectedClass?.name || 'Geral'}</strong>
                              </div>
                              <div className="text-xs text-neutral-500 font-mono tabular-nums">
                                Matrícula: <strong className="text-neutral-900">{selectedStudent.enrollment_code}</strong>
                              </div>
                              <div className="text-[11px] text-neutral-400">
                                Validade: 31/12/2026
                              </div>
                            </div>
                          </div>

                          {/* QR Code */}
                          <div className="text-center">
                            {qrCodeDataUrls[selectedStudent.id] ? (
                              <img
                                src={qrCodeDataUrls[selectedStudent.id]}
                                alt="QR Code"
                                className="w-18 h-18 rounded border border-neutral-200 p-1 bg-white"
                              />
                            ) : (
                              <div className="w-18 h-18 rounded bg-neutral-100 flex items-center justify-center">
                                <QrCode className="w-6 h-6 text-neutral-400" />
                              </div>
                            )}
                            <span className="text-[9px] font-mono tabular-nums text-neutral-400 mt-0.5 block">
                              TOKEN LGPD
                            </span>
                          </div>
                        </div>

                        {/* Card Footer Bar */}
                        <div className="border-t border-neutral-200 pt-1.5 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                          <span>Portaria Escolar &bull; Local-First</span>
                          <span>Validação Óptica</span>
                        </div>
                      </>
                    ) : (
                      /* ── Vertical Preview ── */
                      <>
                        <div className="w-12 h-2 rounded-full bg-neutral-200 mx-auto" />
                        <div className="text-center border-b border-neutral-200 pb-1.5">
                          <div className="font-bold text-xs text-neutral-900">Escola Horizonte</div>
                          <div className="text-[9px] font-mono text-neutral-500">CARTEIRINHA DE ACESSO</div>
                        </div>

                        <div className="flex flex-col items-center text-center space-y-1">
                          <img
                            src={
                              selectedStudent.photo_ref ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt=""
                            className="w-16 h-20 rounded-md object-cover border border-neutral-300"
                          />
                          <div className="font-semibold text-xs text-neutral-900 mt-1">{selectedStudent.full_name}</div>
                          <div className="text-[11px] text-neutral-600">Turma: {selectedClass?.name || 'Geral'}</div>
                          <div className="text-[11px] font-mono font-semibold text-neutral-800">Matrícula: {selectedStudent.enrollment_code}</div>
                        </div>

                        <div className="flex flex-col items-center pt-1 border-t border-neutral-200">
                          {qrCodeDataUrls[selectedStudent.id] && (
                            <img src={qrCodeDataUrls[selectedStudent.id]} alt="QR" className="w-16 h-16 border border-neutral-200 p-0.5" />
                          )}
                          <span className="text-[8px] font-mono text-neutral-400 mt-0.5">TOKEN LGPD</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Print Status & Quick Actions Card */}
                <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">
                        Status de Impressão e Credencial
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {selectedStudent.badge_printed_at ? (
                          <span className="text-emerald-700 font-medium">
                            ✓ Carteirinha impressa em {new Date(selectedStudent.badge_printed_at).toLocaleDateString('pt-BR')} às {new Date(selectedStudent.badge_printed_at).toLocaleTimeString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            ⚠ Carteirinha ainda não foi impressa
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadSinglePng(selectedStudent)}
                        disabled={isExportingPng}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Baixar PNG</span>
                      </button>

                      {selectedStudent.badge_printed_at ? (
                        <button
                          onClick={() => {
                            localDb.markBadgeAsPending(selectedStudent.id);
                            showNotification(`Carteirinha de ${selectedStudent.full_name} marcada como pendente.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium cursor-pointer"
                        >
                          Marcar pendente
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            localDb.markBadgesAsPrinted([selectedStudent.id]);
                            showNotification(`Carteirinha de ${selectedStudent.full_name} marcada como impressa.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium cursor-pointer"
                        >
                          Marcar impressa
                        </button>
                      )}

                      <button
                        onClick={() => setShowRevokeModal(true)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 hover:border-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revogar e reemitir</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1 font-mono text-xs">
                    <div className="text-neutral-600 truncate">
                      Payload Criptográfico: <strong className="text-[#0f766e]">{selectedIdentifier?.raw_token || 'school:student:v1'}</strong>
                    </div>
                    <div className="text-neutral-400 text-[11px] tabular-nums">
                      Emitido em: {selectedIdentifier ? new Date(selectedIdentifier.issued_at).toLocaleString('pt-BR') : 'Hoje'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODE 2: BATCH SHEET & A4 MULTI-PRINTING ── */}
      {layoutMode === 'a4_batch' && (
        <div className="space-y-4 no-print">
          {/* Batch Selection Ribbon */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <span className="font-semibold text-neutral-900">
                {selectedStudentIds.size} de {filteredStudents.length} selecionadas
              </span>

              <div className="h-4 w-px bg-neutral-200" />

              <button
                onClick={handleSelectAllPending}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium cursor-pointer"
              >
                Selecionar pendentes ({pendingStudents.length})
              </button>

              <button
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium cursor-pointer"
              >
                Selecionar filtradas ({filteredStudents.length})
              </button>

              {selectedStudentIds.size > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded-lg text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  Desmarcar todas
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSelectedBatchPng}
                disabled={isExportingPng}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span>{isExportingPng ? 'Baixando...' : 'Baixar PNGs'}</span>
              </button>

              {selectedStudentIds.size > 0 && (
                <>
                  <button
                    onClick={handleMarkSelectedAsPrinted}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Marcar impressas</span>
                  </button>

                  <button
                    onClick={handleMarkSelectedAsPending}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium cursor-pointer"
                  >
                    <span>Marcar pendentes</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table of selectable students */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar aluno no lote..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] w-64"
                />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs text-neutral-700"
                >
                  <option value="all">Todas as turmas</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-neutral-500 font-mono text-[11px]">
                Total na folha: <strong>{chunkedA4Pages.length} página(s) A4</strong> ({studentsToPrintInBatch.length} cartões)
              </div>
            </div>

            <div className="max-h-[460px] overflow-y-auto divide-y divide-neutral-100">
              {filteredStudents.map((s) => {
                const isChecked = selectedStudentIds.has(s.id);
                const c = classrooms.find((cl) => cl.id === s.class_id);
                const isPrinted = !!s.badge_printed_at;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleToggleSelectStudent(s.id)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked ? 'bg-teal-50/50' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div
                        className="rounded border-neutral-300 text-[#0f766e] focus:ring-0 cursor-pointer"
                      />
                      <img
                        src={s.photo_ref || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-7 h-7 rounded-md object-cover border border-neutral-200"
                      />
                      <div>
                        <div className="font-medium text-xs text-neutral-900">{s.full_name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {s.enrollment_code} &bull; {c?.name || 'Geral'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSinglePng(s);
                        }}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                        title="Baixar PNG deste aluno"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {isPrinted ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                          Impressa
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════ ISOLATED PRINT-ONLY CONTAINER (Rendered exclusively during window.print) ════ */}
      <div id="printable-badge-root" className="hidden print:block">
        {layoutMode === 'individual' && selectedStudent && (
          <>
            {printDestination === 'pvc_card' ? (
              /* ── Direct PVC Thermal Card Print (CR-80 / 85.6×54mm edge-to-edge) ── */
              <div
                style={{
                  width: badgeDims.width,
                  height: badgeDims.height,
                  boxSizing: 'border-box',
                  margin: 0,
                  padding: '2.5mm',
                  overflow: 'hidden',
                  background: '#ffffff',
                }}
                className="flex flex-col justify-between border border-neutral-300 relative"
              >
                {!badgeDims.isVertical ? (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-neutral-300 pb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-[#142024] text-white flex items-center justify-center font-bold text-[9px]">
                          EH
                        </div>
                        <div>
                          <div className="font-bold text-[11px] text-neutral-900 tracking-tight leading-none">
                            Escola Horizonte
                          </div>
                          <div className="text-[9px] text-neutral-600 font-mono">
                            Carteirinha de Acesso
                          </div>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-bold bg-neutral-100 px-1 py-0.2 rounded border border-neutral-300">
                        {badgeFormat === 'cr80' ? 'CR-80 PVC' : 'ESTUDANTE'}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="flex items-center justify-between gap-2 py-1">
                      <div className="flex items-center gap-2">
                        <img
                          src={selectedStudent.photo_ref || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-14 h-17 rounded object-cover border border-neutral-300"
                        />
                        <div className="space-y-0.5 text-[10px]">
                          <div className="font-bold text-neutral-900 leading-tight">
                            {selectedStudent.full_name}
                          </div>
                          <div className="text-neutral-600">
                            Turma: <strong>{selectedClass?.name || 'Geral'}</strong>
                          </div>
                          <div className="text-neutral-600 font-mono tabular-nums">
                            Matrícula: <strong>{selectedStudent.enrollment_code}</strong>
                          </div>
                          <div className="text-[9px] text-neutral-500">
                            Validade: 31/12/2026
                          </div>
                        </div>
                      </div>

                      <div className="text-center shrink-0">
                        {qrCodeDataUrls[selectedStudent.id] && (
                          <img
                            src={qrCodeDataUrls[selectedStudent.id]}
                            alt="QR Code"
                            className="w-16 h-16 rounded border border-neutral-300 p-0.5 bg-white"
                          />
                        )}
                        <span className="text-[8px] font-mono text-neutral-500 block mt-0.5">
                          TOKEN LGPD
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-neutral-300 pt-1 flex items-center justify-between text-[9px] text-neutral-600 font-mono">
                      <span>Portaria Escolar Local-First</span>
                      <span>Validação Óptica</span>
                    </div>
                  </>
                ) : (
                  /* Vertical Card */
                  <>
                    <div className="w-8 h-1.5 rounded-full bg-neutral-300 mx-auto" />
                    <div className="text-center border-b border-neutral-300 pb-1">
                      <div className="font-bold text-[10px] text-neutral-900 leading-tight">Escola Horizonte</div>
                      <div className="text-[8px] font-mono text-neutral-500">CARTEIRINHA DE ACESSO</div>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-1">
                      <img
                        src={selectedStudent.photo_ref || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-12 h-15 rounded object-cover border border-neutral-300"
                      />
                      <div className="font-bold text-[10px] text-neutral-900 leading-tight">{selectedStudent.full_name}</div>
                      <div className="text-[9px] text-neutral-600">Turma: {selectedClass?.name || 'Geral'}</div>
                      <div className="text-[9px] font-mono font-bold text-neutral-800">Mat: {selectedStudent.enrollment_code}</div>
                    </div>

                    <div className="flex flex-col items-center pt-1 border-t border-neutral-300">
                      {qrCodeDataUrls[selectedStudent.id] && (
                        <img src={qrCodeDataUrls[selectedStudent.id]} alt="QR" className="w-14 h-14 border border-neutral-300 p-0.5" />
                      )}
                      <span className="text-[7px] font-mono text-neutral-400 mt-0.5">TOKEN LGPD</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* ── Standard A4 Single Card with Precision Cutting Guides (Crop Marks) ── */
              <div
                style={{ width: '210mm', minHeight: '297mm', padding: '20mm', boxSizing: 'border-box' }}
                className="bg-white mx-auto flex flex-col justify-between"
              >
                {/* A4 Sheet Guide Banner */}
                <div className="border-b-2 border-neutral-800 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-neutral-900 uppercase">Escola Horizonte</h2>
                      <p className="text-xs text-neutral-500">Emissão Individual de Carteirinha Estudantil &bull; Escala 100% Real (A4)</p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-neutral-500">
                      <div>Formato: {badgeDims.label}</div>
                      <div>Emissão: {new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                </div>

                {/* Card Container with Precision Crop Marks */}
                <div className="my-10 flex flex-col items-center justify-center">
                  <div className="text-[11px] text-neutral-500 mb-3 flex items-center gap-1.5 font-mono">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Corte nas linhas pontilhadas &bull; Proporção física exata: {badgeDims.width} × {badgeDims.height}</span>
                  </div>

                  {/* Relative Card Box with Corner Crop Marks */}
                  <div className="relative p-3 border border-dashed border-neutral-400 rounded-sm bg-neutral-50/50">
                    {/* Corner marks (L-shapes) */}
                    <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-neutral-800" />
                    <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-neutral-800" />
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-neutral-800" />
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-neutral-800" />

                    {/* Exact Card */}
                    <div
                      style={{ width: badgeDims.width, height: badgeDims.height, boxSizing: 'border-box' }}
                      className="bg-white border border-neutral-400 p-2.5 flex flex-col justify-between relative overflow-hidden select-none"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-neutral-300 pb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded bg-[#142024] text-white flex items-center justify-center font-bold text-[9px]">
                            EH
                          </div>
                          <div>
                            <div className="font-bold text-[11px] text-neutral-900 tracking-tight leading-none">
                              Escola Horizonte
                            </div>
                            <div className="text-[9px] text-neutral-600 font-mono">
                              Carteirinha de Acesso
                            </div>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono font-bold bg-neutral-100 px-1 py-0.2 rounded border border-neutral-300">
                          {badgeFormat === 'cr80' ? 'CR-80' : 'ESTUDANTE'}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="flex items-center justify-between gap-2 py-1">
                        <div className="flex items-center gap-2">
                          <img
                            src={selectedStudent.photo_ref || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-14 h-17 rounded object-cover border border-neutral-300"
                          />
                          <div className="space-y-0.5 text-[10px]">
                            <div className="font-bold text-neutral-900 leading-tight">
                              {selectedStudent.full_name}
                            </div>
                            <div className="text-neutral-600">
                              Turma: <strong>{selectedClass?.name || 'Geral'}</strong>
                            </div>
                            <div className="text-neutral-600 font-mono tabular-nums">
                              Matrícula: <strong>{selectedStudent.enrollment_code}</strong>
                            </div>
                            <div className="text-[9px] text-neutral-500">
                              Validade: 31/12/2026
                            </div>
                          </div>
                        </div>

                        <div className="text-center shrink-0">
                          {qrCodeDataUrls[selectedStudent.id] && (
                            <img
                              src={qrCodeDataUrls[selectedStudent.id]}
                              alt="QR Code"
                              className="w-16 h-16 rounded border border-neutral-300 p-0.5 bg-white"
                            />
                          )}
                          <span className="text-[8px] font-mono text-neutral-500 block mt-0.5">
                            TOKEN LGPD
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-neutral-300 pt-1 flex items-center justify-between text-[9px] text-neutral-600 font-mono">
                        <span>Portaria Escolar Local-First</span>
                        <span>Validação Óptica</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer instructions */}
                <div className="border-t border-neutral-300 pt-3 text-[10px] text-neutral-400 font-mono flex items-center justify-between">
                  <span>Instruções: Imprima em escala 100% (sem ajuste de página) para manter as dimensões nominais.</span>
                  <span>Documento Oficial &bull; Escola Horizonte</span>
                </div>
              </div>
            )}
          </>
        )}

        {layoutMode === 'a4_batch' && (
          <div className="space-y-0">
            {chunkedA4Pages.map((pageStudents, pageIdx) => (
              <div
                key={pageIdx}
                className="printable-sheet bg-white p-6 mx-auto"
                style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
              >
                {/* A4 Sheet Header for Operators (Cut Guide) */}
                <div className="text-[10px] text-neutral-400 font-mono pb-2 mb-4 border-b border-neutral-300 flex items-center justify-between">
                  <span>Escola Horizonte &bull; Lote de Impressão A4 &bull; Página {pageIdx + 1} de {chunkedA4Pages.length}</span>
                  <span>Formato: {badgeDims.label} &bull; {pageStudents.length} unidades nesta folha &bull; Escala 1:1</span>
                </div>

                {/* Grid of Badges on A4 */}
                <div
                  className="grid grid-cols-2 gap-x-6 gap-y-4 justify-center items-start"
                  style={{ width: '100%' }}
                >
                  {pageStudents.map((s) => {
                    const c = classrooms.find((cl) => cl.id === s.class_id);

                    return (
                      <div
                        key={s.id}
                        style={{ width: badgeDims.width, height: badgeDims.height }}
                        className={`bg-white p-2.5 flex flex-col justify-between relative overflow-hidden select-none box-border ${
                          showCropMarks ? 'border border-dashed border-neutral-400' : 'border border-neutral-300'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-neutral-300 pb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-[#142024] text-white flex items-center justify-center font-bold text-[9px]">
                              EH
                            </div>
                            <div>
                              <div className="font-bold text-[10px] text-neutral-900 tracking-tight leading-none">
                                Escola Horizonte
                              </div>
                              <div className="text-[8px] text-neutral-600 font-mono">
                                Carteirinha Escolar
                              </div>
                            </div>
                          </div>
                          <span className="text-[8px] font-mono font-bold bg-neutral-100 px-1 py-0.2 rounded border border-neutral-300">
                            CR-80
                          </span>
                        </div>

                        {/* Middle */}
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                s.photo_ref ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt=""
                              className="w-13 h-16 rounded object-cover border border-neutral-300"
                            />
                            <div className="space-y-0.5 text-[10px]">
                              <div className="font-bold text-neutral-900 leading-tight">
                                {s.full_name}
                              </div>
                              <div className="text-neutral-600">
                                Turma: <strong>{c?.name || 'Geral'}</strong>
                              </div>
                              <div className="text-neutral-600 font-mono tabular-nums">
                                Matrícula: <strong>{s.enrollment_code}</strong>
                              </div>
                              <div className="text-[8px] text-neutral-500">
                                Validade: 31/12/2026
                              </div>
                            </div>
                          </div>

                          <div className="text-center shrink-0">
                            {qrCodeDataUrls[s.id] && (
                              <img
                                src={qrCodeDataUrls[s.id]}
                                alt="QR Code"
                                className="w-15 h-15 rounded border border-neutral-300 p-0.5 bg-white"
                              />
                            )}
                            <span className="text-[7px] font-mono text-neutral-500 block">
                              TOKEN SEGURO
                            </span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-neutral-300 pt-0.5 flex items-center justify-between text-[8px] text-neutral-500 font-mono">
                          <span>Portaria Escolar Local-First</span>
                          <span>Leitor HID / Óptico</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal to Mark as Printed after dialog */}
      {showConfirmPrintedModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Confirmar Impressão Realizada
              </h3>
              <button
                onClick={() => setShowConfirmPrintedModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              O trabalho foi enviado para a impressora. Deseja marcar as carteirinhas impressas como <strong>"Impressas"</strong> no banco de dados para tirá-las da lista de pendentes?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setShowConfirmPrintedModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Não marcar agora
              </button>
              <button
                onClick={handleConfirmMarkAsPrinted}
                className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium transition-colors duration-150 cursor-pointer"
              >
                Sim, marcar como impressas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                Revogar credencial de acesso
              </h3>
              <button
                onClick={() => setShowRevokeModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Deseja revogar o cartão atual de <strong>{selectedStudent?.full_name}</strong>? O token anterior será invalidado imediatamente na portaria e a carteirinha voltará para a lista de <strong>Pendentes de Impressão</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReissueBadge}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors duration-150 cursor-pointer"
              >
                Confirmar revogação e reemitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
