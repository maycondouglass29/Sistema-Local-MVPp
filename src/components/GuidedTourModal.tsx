/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Keyboard,
  ShieldCheck,
  Zap,
  HardDrive,
  Users,
  QrCode,
  FileText,
  Clock,
  Sliders,
  RotateCcw,
  Camera,
  Check,
  LayoutGrid,
  TrendingUp,
  Download,
  Phone,
  MessageCircle,
  UserCheck,
  LogOut,
  ArrowRight,
  Printer,
  Compass,
  Layers,
} from 'lucide-react';

export interface TourStep {
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
  shortcut?: string;
  highlightTag?: string;
}

export interface TabTourInfo {
  id: string;
  screenName: string;
  category: string;
  roleNotice: string;
  summary: string;
  steps: TourStep[];
}

export const COMPLETE_TOUR_DATA: { [tab: string]: TabTourInfo } = {
  portaria: {
    id: 'portaria',
    screenName: 'Portaria e Acesso',
    category: 'Operações de Portaria',
    roleNotice: 'Foco prioritário: Operadores de Portaria, Porteiros e Inspetores Escolares',
    summary: 'Operação ultraveloz com leitura em < 15ms no leitor USB/câmera, validação de regras de acesso em tempo real e simulador de testes.',
    steps: [
      {
        title: 'Leitura Instantânea em Menos de 15ms (Local-First Puro)',
        badge: 'Operação Central',
        description:
          'O terminal opera 100% autônomo e offline sob a arquitetura Local-First. Conecte um leitor de código de barras ou leitor de QR Code USB (modo teclado HID), ou aponte a carteirinha para a câmera. O sistema localiza o estudante, avalia as regras pedagógicas e grava a presença instantaneamente no banco SQLite WAL.',
        icon: <Zap className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'O cursor fica travado no campo de leitura continuamente; você não precisa clicar na tela a cada aluno.',
          'Para digitar uma matrícula avulsa (ex: 2024-001 ou 2024001), basta digitar os números e pressionar ENTER.',
          'Pressione a tecla F2 no teclado físico para alternar rapidamente entre modo Entrada e modo Saída.',
        ],
        shortcut: 'ENTER para validar • F2 para alternar Entrada/Saída',
      },
      {
        title: 'Detecção de Câmera USB Externa e OBS Virtual',
        badge: 'Hardware & Vídeo',
        description:
          'O sistema identifica automaticamente webcams externas conectadas, placas de captura HDMI e streams do OBS Virtual Camera, priorizando dispositivos de alta definição para leitura ótica de crachás.',
        icon: <Camera className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'Ao plugar uma câmera externa, o sistema detecta o evento de hotplug e sugere a comutação automática.',
          'Você pode desativar a prévia de vídeo a qualquer momento com o botão "Câmera ativa / inativa" para economizar processamento.',
        ],
      },
      {
        title: 'Motor de Decisão Laya & Sinais Sonoros',
        badge: 'Segurança & Auditoria',
        description:
          'Cada bip passa pelo Laya Decision Engine, que avalia se a matrícula está ativa, se há ordem judicial/bloqueio temporário pela coordenação ou se o aluno tenta entrar fora do horário letivo.',
        icon: <ShieldCheck className="w-6 h-6 text-emerald-700" />,
        tips: [
          'Bip duplo suave: Acesso Liberado com sucesso (Entrada ou Saída confirmada).',
          'Bip de atenção: Aviso operacional (ex: duplicidade dentro do cooldown de 60s ou alerta médico de saúde).',
          'Bip grave longo: Bloqueio administrativo ou matrícula inativa (reter estudante para acolhimento na coordenação).',
        ],
      },
      {
        title: 'Simulador de Crachás para Treinamento da Equipe',
        badge: 'Homologação Rápida',
        description:
          'Clique no botão "Simulador de crachás" para testar instantaneamente os 5 perfis pedagógicos mais comuns sem precisar de cartões físicos: alunos regulares, alertas de alergia severa, suspensões temporárias e transferências.',
        icon: <Sparkles className="w-6 h-6 text-amber-600" />,
        tips: [
          'Sophia Martins Castro: Testa a rejeição automática de matrículas inativas / transferência.',
          'Gabriel Rodrigues Lima: Testa a retenção por suspensão disciplinar da coordenação.',
          'Mariana Duarte Souza: Testa a liberação com alerta médico crítico em destaque na tela.',
        ],
      },
      {
        title: 'Retificação Não-Destrutiva de Passagens (RF-05)',
        badge: 'Conformidade LGPD',
        description:
          'Se um aluno bipou o crachá por engano, use "Registrar retificação de evento". O evento original NUNCA é deletado; um novo registro corretivo é gravado com justificativa e operador assinante, garantindo auditoria imutável.',
        icon: <RotateCcw className="w-6 h-6 text-sky-700" />,
        tips: [
          'A justificativa exige no mínimo 8 caracteres para assegurar formalidade.',
          'O log registra o operador de plantão e o timestamp exato em UTC e horário local.',
        ],
      },
    ],
  },

  dashboard: {
    id: 'dashboard',
    screenName: 'Painel Geral de Frequência',
    category: 'Gestão Escolar',
    roleNotice: 'Foco prioritário: Coordenação Pedagógica, Diretores e Supervisão de Acolhimento',
    summary: 'Visão executiva em tempo real com 5 KPIs consolidados, curva horária de fluxo por rotina escolar, chamada por turma e busca ativa via WhatsApp.',
    steps: [
      {
        title: '5 KPIs Executivos de Monitoramento em Tempo Real',
        badge: 'Quórum Imediato',
        description:
          'No topo do painel, visualize instantaneamente: Alunos no Prédio (com taxa percentual de ocupação), Saídas Concluídas, Alunos Ausentes, Alertas de Acolhimento em Sala e a Integridade da Fila Local Outbox (SQLite WAL).',
        icon: <TrendingUp className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'Todos os números atualizam em tempo real a cada leitura na portaria, sem necessidade de recarregar a página.',
          'A taxa de ocupação compara a presença física atual contra a capacidade ativa cadastrada.',
        ],
      },
      {
        title: 'Fluxo de Portaria por Horário & Faixas da Rotina',
        badge: 'Curva de Densidade',
        description:
          'O gráfico horário (das 06:00 às 18:00) identifica os volumes de pico de entrada matutina (07:00 – 07:30), movimentação de almoço/troca de turno (11:45 – 13:00) e dispersão vespertina (17:00 – 18:00).',
        icon: <Clock className="w-6 h-6 text-amber-600" />,
        tips: [
          'Passe o mouse sobre as barras para ver a contagem exata de entradas e saídas de cada hora.',
          'O sistema destaca automaticamente o horário de maior vazão do dia letivo.',
        ],
      },
      {
        title: 'Presença por Turma com Barra Multi-Estado & Chamada em 1 Clique',
        badge: 'Operação de Sala',
        description:
          'Cada classe apresenta uma barra proporcional em três cores: Verde (Em Sala), Âmbar (Já saiu) e Cinza (Ausente). Clique em qualquer turma para abrir a chamada rápida nominal daquela sala.',
        icon: <Users className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'As turmas com quórum acima de 80% recebem selo verde de assiduidade.',
          'A chamada detalha quem já chegou, quem foi liberado antecipadamente e quem faltou.',
        ],
      },
      {
        title: 'Busca Ativa de Ausentes com Disparo de WhatsApp',
        badge: 'Contato com Pais',
        description:
          'No botão "Alunos ausentes", abra a lista completa de estudantes sem registro de entrada hoje. O botão "WhatsApp" abre uma conversa com os responsáveis com mensagem formal pré-formatada pela escola.',
        icon: <MessageCircle className="w-6 h-6 text-emerald-700" />,
        tips: [
          'Permite ligar imediatamente para o telefone do responsável com 1 clique.',
          'Se o dia estiver no início, o botão "Carregar amostra matutina" preenche dados de simulação para demonstrações.',
        ],
      },
      {
        title: 'Exportação Consolidada (CSV e Relatório A4)',
        badge: 'Prestação de Contas',
        description:
          'Exporte a planilha diária completa para Excel/Google Sheets ou imprima o resumo oficial A4 diagramado para arquivamento e reuniões pedagógicas.',
        icon: <FileText className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'O arquivo CSV inclui colunas com matrícula, turma, status de presença e telefone dos responsáveis.',
        ],
      },
    ],
  },

  badges: {
    id: 'badges',
    screenName: 'Emissão de Carteirinhas',
    category: 'Operações de Portaria',
    roleNotice: 'Foco prioritário: Secretaria Escolar, Recepção e Gráfica Interna',
    summary: 'Estúdio com calibração precisa em milímetros para cartões PVC CR-80 (1:1), crachás verticais, folhas A4 em lote com guias de corte e exportação PNG a 300 DPI.',
    steps: [
      {
        title: 'Formatos Físicos de Fabricação Padronizados',
        badge: 'Calibração Físico-Mecânica',
        description:
          'Escolha entre o padrão internacional de cartão PVC CR-80 (85.60 × 53.98 mm), crachá vertical estudantil (54 × 85.6 mm com slot hole), crachá médio para bolsa plástica (90 × 60 mm), credencial de eventos (70 × 100 mm) ou dimensões personalizadas em milímetros.',
        icon: <QrCode className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'Compatível com impressoras térmicas diretas de sublimação Zebra, Evolis, Datacard e Fargo.',
          'As proporções na tela refletem milimetricamente a escala física real do documento final.',
        ],
      },
      {
        title: 'Impressão 1:1 Direta em PVC vs Folha A4 com Guias de Corte',
        badge: 'Destino de Saída',
        description:
          'No modo "Cartão PVC Direto", a página é configurada em tamanho exato sem margens. No modo "Folha A4 Individual", o cartão é centralizado com marcações de corte em "L" (crop-marks) nos 4 cantos para guilhotina ou estilete.',
        icon: <Printer className="w-6 h-6 text-sky-700" />,
        tips: [
          'No modo Folha A4 em Lote, o estúdio organiza 8 ou 10 cartões por folha com máximo aproveitamento.',
          'O isolamento de impressão oculta menus e barras do navegador para evitar qualquer distorção visual.',
        ],
      },
      {
        title: 'Exportação Digital em Alta Definição (Canvas 300 DPI)',
        badge: 'Gráficas & WhatsApp',
        description:
          'Clique em "Baixar PNG (300 DPI)" para gerar uma imagem com matriz gráfica vetorial ultranítida (1011 × 638 pixels no CR-80), perfeita para enviar por WhatsApp aos pais ou arquivar na ficha digital do aluno.',
        icon: <Download className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'O botão "Baixar Lote (PNGs)" exporta as carteirinhas de múltiplos alunos selecionados de uma só vez.',
        ],
      },
      {
        title: 'Privacidade Criptográfica por Design (LGPD)',
        badge: 'Segurança da Informação',
        description:
          'O QR Code impresso contém exclusivamente um token opaco imutável (ex: school:student:uuidv7:v1). Nunca expõe CPF, RG, filiação ou biometria. Se o crachá for perdido, basta revogar e reemitir com 1 clique.',
        icon: <ShieldCheck className="w-6 h-6 text-emerald-700" />,
        tips: [
          'O token revogado é invalidado instantaneamente no banco local SQLite, impedindo fraudes na catraca.',
        ],
      },
    ],
  },

  guardians: {
    id: 'guardians',
    screenName: 'Responsáveis e Avisos',
    category: 'Gestão Escolar',
    roleNotice: 'Foco prioritário: Secretaria, Coordenação e Controle de Saída de Menores',
    summary: 'Visualização moderna em Cards (padrão) e Lista, WhatsApp direto em 1 clique, autorizações de retirada na portaria e busca unificada por dependentes.',
    steps: [
      {
        title: 'Visualização em Cards Selecionada por Padrão',
        badge: 'Ergonomia Visual',
        description:
          'A tela inicial abre diretamente no modo Cards, oferecendo um panorama rico dos responsáveis, parentesco (Mãe, Pai, Avó, Tutor Legal), canais de emergência e estudantes vinculados.',
        icon: <LayoutGrid className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'Você pode alternar para o modo Lista (Tabela) a qualquer momento pelo seletor no cabeçalho.',
          'O topo da página exibe KPIs com o total de responsáveis com autorização ativa de busca e telefones verificados.',
        ],
      },
      {
        title: 'Contato Direto via WhatsApp e Ligação em 1 Clique',
        badge: 'Canais Rápidos',
        description:
          'Cada cartão dispõe de botões diretos de ação: o botão "WhatsApp" abre a conversa com mensagem formal da Escola Horizonte já preenchida com o nome dos alunos dependentes, e o botão de telefone dispara a chamada imediata.',
        icon: <MessageCircle className="w-6 h-6 text-emerald-700" />,
        tips: [
          'Economiza tempo crítico da equipe da secretaria e da portaria em caso de ocorrências ou mal-estar do aluno.',
        ],
      },
      {
        title: 'Vínculos de Retirada Autorizada na Portaria',
        badge: 'Segurança Escolar',
        description:
          'Os cartões exibem os mini-cards dos estudantes autorizados a serem retirados por aquele responsável, com selo verde "Autorizado", foto e turma para verificação visual na catraca.',
        icon: <UserCheck className="w-6 h-6 text-sky-700" />,
        tips: [
          'A barra de pesquisa permite localizar o responsável digitando seu nome, seu telefone ou o nome de qualquer filho vinculado.',
          'Um mesmo responsável pode estar associado a irmãos de turmas diferentes.',
        ],
      },
    ],
  },

  history: {
    id: 'history',
    screenName: 'Histórico de Frequência & Auditoria',
    category: 'Gestão Escolar',
    roleNotice: 'Foco prioritário: Coordenação Pedagógica, Direção e Auditoria Disciplinar',
    summary: 'Auditoria imutável com 4 KPIs executivos no topo, filtros ergonômicos em 2 camadas, visualização em Linha do Tempo direcional e emissão de Relatório Oficial A4.',
    steps: [
      {
        title: 'KPIs Executivos no Topo da Página',
        badge: 'Contexto Imediato',
        description:
          'Ao acessar o histórico, os contadores de Eventos Auditados, Entradas Confirmadas, Saídas Liberadas e Retificações (RF-05) aparecem imediatamente no topo, oferecendo a visão geral antes dos filtros.',
        icon: <Layers className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'Números sempre alinhados em formato mono-espaçado para fácil conferência numérica.',
        ],
      },
      {
        title: 'Filtros Ergonômicos Consolidados em Duas Camadas',
        badge: 'Pesquisa Precisa',
        description:
          'A primeira camada reúne pílulas de período rápido (Hoje, Ontem, Últimos 7 dias, Este mês, Todo o histórico) e seletores de data compactos. A segunda camada traz busca com limpeza em 1 clique, filtro de turmas e filtro de sentido (Entrada/Saída/Retificação).',
        icon: <Sliders className="w-6 h-6 text-amber-600" />,
        tips: [
          'O botão de limpar filtros aparece automaticamente assim que qualquer critério for ativado.',
        ],
      },
      {
        title: 'Linha do Tempo com Fluxo Direcional e Carimbos Auditados',
        badge: 'Rastreabilidade Total',
        description:
          'No modo Linha do Tempo, cada passagem de aluno exibe setas indicativas de sentido (Entrada verde ↙, Saída âmbar ↗, Retificação ↺), foto, carimbo de data/hora até os segundos, identificador do leitor de hardware e operador assinante.',
        icon: <Clock className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'Use o botão "Detalhes" para inspecionar os hashes de integridade da leitura e conferir o estado de sincronização.',
          'O botão "Retificar" permite corrigir passagens indevidas sem apagar o histórico de auditoria original.',
        ],
      },
      {
        title: 'Relatório Oficial Padrão A4 com Assinaturas',
        badge: 'Documento Institucional',
        description:
          'Clique em "Imprimir A4" para configurar o relatório formal contendo cabeçalho institucional da Escola Horizonte, resumo por turma, distribuição horária e três campos formais para assinatura da Direção, Coordenação e Portaria.',
        icon: <Printer className="w-6 h-6 text-sky-700" />,
        tips: [
          'Pronto para arquivo impresso ou arquivamento em PDF para apresentação ao Conselho Escolar.',
        ],
      },
    ],
  },

  students: {
    id: 'students',
    screenName: 'Cadastro de Alunos & Carga em Massa',
    category: 'Gestão Escolar',
    roleNotice: 'Foco: Secretaria Escolar e Coordenação',
    summary: 'Fichas cadastrais completas, anotações médicas, importação em lote de arquivos .CSV e suspensão de acesso justificada.',
    steps: [
      {
        title: 'Carga em Massa (.CSV) com Pré-Validação de Dados',
        badge: 'Produtividade (RF-07)',
        description:
          'Importe centenas de alunos colando ou selecionando sua planilha em formato .CSV. O sistema pré-valida colunas, avisa sobre duplicidades de matrícula antes de gravar e gera automaticamente os tokens QR criptografados.',
        icon: <FileText className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'Não trava o sistema mesmo com bases de mais de 1.000 estudantes.',
        ],
      },
      {
        title: 'Bloqueio e Desbloqueio Administrativo Justificado',
        badge: 'Segurança na Catraca',
        description:
          'Precisa reter temporariamente um estudante na portaria? Aplique o bloqueio administrativo na ficha do aluno. O terminal da portaria emitirá alerta sonoro grave e mensagem na tela orientando o encaminhamento à coordenação.',
        icon: <ShieldCheck className="w-6 h-6 text-amber-600" />,
        tips: [
          'Toda ação de bloqueio e desbloqueio requer motivo formal para registro de auditoria.',
        ],
      },
    ],
  },

  classes: {
    id: 'classes',
    screenName: 'Turmas e Séries',
    category: 'Gestão Escolar',
    roleNotice: 'Foco: Coordenação Pedagógica e Secretaria',
    summary: 'Estruturação de turmas, salas e turnos letivos com proteção de integridade contra deleções acidentais.',
    steps: [
      {
        title: 'Segmentação por Turnos e Ciclos Letivos',
        badge: 'Estrutura Escolar',
        description:
          'Cadastre turmas do Ensino Fundamental II e Ensino Médio nos turnos Matutino, Vespertino e Integral. Essas turmas alimentam a tolerância horária da portaria.',
        icon: <Users className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'O sistema impede a exclusão de turmas que possuam alunos ativos vinculados para proteger o histórico de presença.',
        ],
      },
    ],
  },

  users: {
    id: 'users',
    screenName: 'Controle de Usuários e Acessos (RBAC)',
    category: 'Administração do Sistema',
    roleNotice: 'Foco: Direção Escolar e Gestores de TI',
    summary: 'Autenticação com e-mail e senha institucional, reset administrativo de credenciais, matriz RBAC e exportação de auditoria.',
    steps: [
      {
        title: 'Login Seguro por E-mail Institucional e Senha',
        badge: 'Acesso Protegido',
        description:
          'O sistema conta com tela de login com credenciais institucionais protegidas (ex: Maycon Douglas como Admin TI e Prof. Felipe Rocha como Coordenação), eliminando botões genéricos de acesso sem senha.',
        icon: <ShieldCheck className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'As sessões ficam vinculadas ao perfil selecionado, permitindo rastrear o operador exato de cada registro.',
        ],
      },
      {
        title: 'Reset de Senhas & Matriz de Políticas RBAC',
        badge: 'Gestão de Operadores',
        description:
          'Adicione novos operadores de portaria ou redefina senhas esquecidas com 1 clique através do modal administrativo seguro. A matriz de políticas exibe detalhadamente o que cada perfil pode acessar.',
        icon: <Sliders className="w-6 h-6 text-sky-700" />,
        tips: [
          'O botão "Exportar Usuários (.CSV)" gera a lista de operadores autorizados com data de criação.',
        ],
      },
    ],
  },

  config: {
    id: 'config',
    screenName: 'Configurações e Banco Local',
    category: 'Administração do Sistema',
    roleNotice: 'Foco: TI, Manutenção e Coordenação Pedagógica',
    summary: 'Gerenciamento de periféricos USB/Câmeras, parâmetros PRAGMA do SQLite WAL, tolerância horária e backup JSON com 1 clique.',
    steps: [
      {
        title: 'Gerenciador de Hardware & Bipes de Áudio',
        badge: 'Periféricos de Entrada',
        description:
          'Teste os bipes sonoros do terminal da portaria, configure o dispositivo de captura de vídeo preferencial e ative a comutação automática para câmeras externas USB.',
        icon: <Zap className="w-6 h-6 text-[#0f766e]" />,
        tips: [
          'Use o teste sonoro para assegurar que os avisos de acesso liberado e bloqueado estão audíveis no ambiente físico da portaria.',
        ],
      },
      {
        title: 'Tolerância Matutina e Janela Anti-Duplicidade',
        badge: 'Regras Pedagógicas',
        description:
          'Ajuste o tempo de tolerância para atrasos matutinos (padrão 15 min) e o intervalo de bloqueio contra leituras duplas acidentais (de 30 a 120 segundos).',
        icon: <Sliders className="w-6 h-6 text-amber-600" />,
        tips: [
          'As alterações entram em vigor imediatamente no terminal sem reiniciar o computador.',
        ],
      },
      {
        title: 'Resiliência Local-First & Backup Completo do Banco',
        badge: 'Dados Seguros',
        description:
          'Inspecione os parâmetros PRAGMA do SQLite (WAL ativo, synchronous=NORMAL), acompanhe a fila transacional Outbox e baixe um backup instantâneo completo em formato JSON com 1 clique.',
        icon: <HardDrive className="w-6 h-6 text-emerald-700" />,
        tips: [
          'O sistema funciona com 100% dos recursos mesmo quando o cabo de rede estiver desconectado.',
        ],
      },
    ],
  },
};

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onNavigateTab?: (tab: string) => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  currentTab,
  onNavigateTab,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<string>(currentTab || 'portaria');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Sync selected tab with currentTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTabId(currentTab || 'portaria');
      setCurrentStepIndex(0);
    }
  }, [isOpen, currentTab]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const currentTour = COMPLETE_TOUR_DATA[selectedTabId] || COMPLETE_TOUR_DATA.portaria;
  const currentStep = currentTour.steps[currentStepIndex] || currentTour.steps[0];
  const totalSteps = currentTour.steps.length;

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
      setCurrentStepIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSelectTab = (tabId: string) => {
    setSelectedTabId(tabId);
    setCurrentStepIndex(0);
  };

  const handleGoToPage = () => {
    if (onNavigateTab) {
      onNavigateTab(selectedTabId);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl border border-neutral-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header: Title, Module Badge & Close Button */}
        <div className="flex items-start justify-between border-b border-neutral-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center border border-[#0f766e]/20 shadow-2xs shrink-0">
              <Compass className="w-5 h-5 text-[#0f766e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-neutral-900">
                  Guia Interativo do Sistema
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Módulo: {currentTour.screenName}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {currentTour.roleNotice}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Fechar guia rápido (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Module Selector Pill Strip (Allows jumping to any page's tour!) */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
            <span>Selecione a página para conhecer os recursos:</span>
            <span className="font-mono text-[10px] text-neutral-400">9 módulos disponíveis</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {Object.values(COMPLETE_TOUR_DATA).map((tab) => {
              const isSelected = tab.id === selectedTabId;
              const isCurrentActivePage = tab.id === currentTab;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-[#0f766e] text-white shadow-2xs font-semibold'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  <span>{tab.screenName}</span>
                  {isCurrentActivePage && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-[#0f766e]'
                      }`}
                      title="Página que você está usando agora"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs">
          <div className="flex items-center gap-1.5">
            {currentTour.steps.map((_, idx) => {
              const isPassed = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    isCurrent
                      ? 'w-7 bg-[#0f766e]'
                      : isPassed
                      ? 'w-3 bg-emerald-400'
                      : 'w-3 bg-neutral-200 hover:bg-neutral-300'
                  }`}
                  title={`Ir para o passo ${idx + 1}`}
                />
              );
            })}
          </div>

          <span className="font-mono text-neutral-500 font-medium text-[11px]">
            Passo {currentStepIndex + 1} de {totalSteps}
          </span>
        </div>

        {/* Main Step Content Card */}
        <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Step Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 text-neutral-700 flex items-center justify-center shrink-0 shadow-2xs">
              {currentStep.icon}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {currentStep.badge}
                </span>
                {currentStep.shortcut && (
                  <span className="font-mono text-[10px] text-neutral-500 bg-white border border-neutral-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Keyboard className="w-3 h-3 text-neutral-400" />
                    {currentStep.shortcut}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-neutral-900 text-sm leading-snug">
                {currentStep.title}
              </h4>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-neutral-700 leading-relaxed bg-white p-3 rounded-lg border border-neutral-200/80">
            {currentStep.description}
          </p>

          {/* Operational Tips */}
          <div className="space-y-1.5 pt-0.5">
            <div className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Dicas Práticas & Regras de Uso:</span>
            </div>
            <div className="space-y-1.5">
              {currentStep.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-neutral-600 bg-white/70 p-2 rounded-md border border-neutral-100"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            {onNavigateTab && selectedTabId !== currentTab && (
              <button
                onClick={handleGoToPage}
                className="px-3 py-1.5 rounded-lg border border-[#0f766e] text-[#0f766e] hover:bg-[#0f766e]/10 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="Abrir este módulo na tela agora"
              >
                <span>Navegar para {currentTour.screenName}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
              Use as setas ← → do teclado
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>{currentStepIndex < totalSteps - 1 ? 'Próximo passo' : 'Entendido, fechar'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
