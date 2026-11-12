import React, { useState } from 'react';
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
} from 'lucide-react';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
}

interface TourStep {
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
  shortcut?: string;
}

const TAB_TOUR_DATA: { [tab: string]: { screenName: string; roleNotice: string; steps: TourStep[] } } = {
  portaria: {
    screenName: 'Terminal de Portaria',
    roleNotice: 'Foco prioritário: Operador da Portaria e Inspetores de Entrada',
    steps: [
      {
        title: 'Leitura Instantânea em Menos de 500ms',
        badge: 'Operação Principal',
        description:
          'O terminal funciona sob a filosofia Local-First. Conecte um leitor de código de barras ou QR Code USB (modo teclado HID). Ao apontar a carteirinha do aluno, o sistema lê, valida o status no SQLite local e grava a presença instantaneamente, sem precisar de internet.',
        icon: <Zap className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'O cursor fica travado no campo automaticamente, você não precisa clicar na tela a cada leitura.',
          'Para digitar uma matrícula avulsa (ex.: 2026-014), basta digitar os números e apertar ENTER.',
          'Pressione F2 no teclado para alternar rapidamente entre Entrada e Saída.',
        ],
        shortcut: 'ENTER para validar • F2 para alternar modo Entrada/Saída',
      },
      {
        title: 'Alternância de Sentido (Entrada / Saída)',
        badge: 'Controle de Fluxo',
        description:
          'No topo do leitor, selecione se está registrando a Entrada (início do turno) ou a Saída (encerramento de aula ou liberação). O sistema valida se o estudante já se encontra dentro da instituição e alerta em caso de duplicidades acidentais.',
        icon: <Sliders className="w-6 h-6 text-amber-600" />,
        tips: [
          'Se um aluno passar o crachá duas vezes seguidas em menos de 60 segundos, o sistema emite alerta de duplicidade.',
          'A opção "Permitir repetição de evento" pode ser ativada na coluna da direita para exceções operacionais.',
        ],
      },
      {
        title: 'Regras de Acesso e Alertas Sonoros',
        badge: 'Segurança Escolar',
        description:
          'O sistema avalia em tempo real se a matrícula está ativa, se há ordem de bloqueio/suspensão pela coordenação, ou se o aluno está tentando entrar fora do horário da grade dele.',
        icon: <ShieldCheck className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Bip agudo duplo: Acesso Liberado com sucesso.',
          'Bip de aviso: Alerta de horário ou duplicidade.',
          'Bip grave longo: Bloqueio ou matrícula suspensa (reter aluno para orientação pedagógica).',
        ],
      },
      {
        title: 'Correção Justificada de Eventos (RF-03)',
        badge: 'Auditoria LGPD',
        description:
          'Caso ocorra uma passagem incorreta (exemplo: aluno que passou o crachá do colega), clique em "Criar correção de evento". O evento original NUNCA é apagado, criando um registro complementar com justificativa auditável.',
        icon: <RotateCcw className="w-6 h-6 text-cyan-700" />,
        tips: [
          'A justificativa deve ter no mínimo 8 caracteres.',
          'O log registra o operador de plantão e a hora exata da alteração.',
        ],
      },
    ],
  },
  dashboard: {
    screenName: 'Visão Geral (Monitoramento em Tempo Real)',
    roleNotice: 'Foco prioritário: Coordenação Pedagógica, Direção e Administradores',
    steps: [
      {
        title: 'Acompanhamento do Fluxo em Tempo Real',
        badge: 'Estatísticas do Dia',
        description:
          'Visualize com clareza o total de alunos presentes dentro da escola, as saídas já efetuadas e a taxa percentual de presença consolidada de hoje.',
        icon: <Users className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Os números atualizam automaticamente a cada bip na portaria sem recarregar a página.',
          'O gráfico de distribuição horária revela os momentos de pico na entrada matutina.',
        ],
      },
      {
        title: 'Gestão Ativa de Faltosos',
        badge: 'Ação Rápida',
        description:
          'Clique no botão "Ver Ausentes" para abrir a lista imediata de todos os alunos que ainda não registraram entrada hoje, filtrando por turma e com telefone do responsável para contato rápido.',
        icon: <Clock className="w-6 h-6 text-rose-600" />,
        tips: [
          'Ideal para a coordenação identificar faltas antes do início da segunda aula.',
          'Permite exportar a lista de faltosos em formato CSV para planilhas.',
        ],
      },
      {
        title: 'Exportação Executiva de Dados',
        badge: 'Relatórios do Dia',
        description:
          'Use o botão "Exportar Dados" para baixar a planilha consolidada do dia ou gerar o resumo formatado pronto para a coordenação pedagógica.',
        icon: <FileText className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Compatível com Microsoft Excel, Google Planilhas e LibreOffice.',
        ],
      },
    ],
  },
  students: {
    screenName: 'Gestão de Alunos & Carga em Massa',
    roleNotice: 'Foco: Secretaria Escolar e Coordenação',
    steps: [
      {
        title: 'Carga em Massa (.CSV) em Poucos Segundos',
        badge: 'Produtividade (RF-07)',
        description:
          'Importe centenas de estudantes de uma vez só colando ou selecionando seu arquivo CSV com colunas de matrícula, nome, turma e responsável.',
        icon: <FileText className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'O sistema possui pré-validação automática que avisa antes da gravação se há matrículas repetidas ou campos vazios.',
          'Ao importar, o sistema já gera o token de QR Code opaco criptografado para cada aluno.',
        ],
      },
      {
        title: 'Bloqueio e Desbloqueio Administrativo',
        badge: 'Segurança de Acesso',
        description:
          'Precisa suspender temporariamente o acesso de um estudante na portaria? Use o botão de escudo no aluno correspondente. Ao tentar bipar, o terminal de portaria reterá o aluno com aviso sonoro e tela de alerta.',
        icon: <ShieldCheck className="w-6 h-6 text-amber-600" />,
        tips: [
          'Toda ação de bloqueio e liberação exige justificativa para fins de auditoria interna.',
        ],
      },
    ],
  },
  classes: {
    screenName: 'Estrutura de Turmas e Turnos',
    roleNotice: 'Foco: Coordenação Pedagógica e Secretaria',
    steps: [
      {
        title: 'Divisão por Séries e Turnos',
        badge: 'Organização Escolar',
        description:
          'Cadastre salas, séries e turnos (Manhã, Tarde ou Integral). As turmas são utilizadas nas regras de validação para impedir entradas fora de horário.',
        icon: <Users className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Ao matricular alunos ou importar via CSV, você pode associá-los diretamente às turmas existentes.',
        ],
      },
    ],
  },
  guardians: {
    screenName: 'Cadastro de Responsáveis Legais',
    roleNotice: 'Foco: Secretaria e Assistência ao Aluno',
    steps: [
      {
        title: 'Vínculos Parentais e Contatos de Emergência',
        badge: 'Controle de Saída',
        description:
          'Cadastre pais, mães e responsáveis legais, vinculando-os a um ou mais alunos. Estes contatos aparecem na tela da portaria para checagem visual em saídas antecipadas.',
        icon: <Users className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Um responsável pode estar vinculado a múltiplos filhos da mesma família.',
        ],
      },
    ],
  },
  users: {
    screenName: 'Controle de Usuários e Operadores (RBAC)',
    roleNotice: 'Foco: Administração Escolar e TI',
    steps: [
      {
        title: 'Níveis de Acesso Baseados em Função',
        badge: 'Segurança (RBAC)',
        description:
          'O sistema distingue 3 papéis fundamentais: Operador de Portaria (leitura e registro rápido), Coordenação (regras pedagógicas e justificativas) e Administrador TI (configuração e backup do banco SQLite).',
        icon: <ShieldCheck className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Use o seletor no topo da página para alternar o operador em uso para fins de teste e auditoria.',
        ],
      },
    ],
  },
  badges: {
    screenName: 'Estúdio de Carteirinhas e QR Code LGPD',
    roleNotice: 'Foco: Secretaria e Emissão de Documentos',
    steps: [
      {
        title: 'Privacy by Design — QR Code Seguro',
        badge: 'Conformidade LGPD (RF-7.1)',
        description:
          'As carteirinhas geradas pelo sistema utilizam tokens opacos criptográficos (ex: school_horizonte:student:uuidv7:v1). Não imprimem CPF, filiação nem biometria exposta.',
        icon: <QrCode className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Se o aluno perder o crachá, use "Revogar e Reemitir Credencial" para anular o token antigo imediatamente no leitor sem apagar o histórico de frequência.',
        ],
      },
      {
        title: 'Impressão em Padrão CR-80 ou Folha A4',
        badge: 'Formatos Físicos',
        description:
          'Alterne entre visualização individual da carteirinha (85x54mm) ou "Folha de Lote (A4)", que organiza 8 carteirinhas por folha prontas para plastificação.',
        icon: <FileText className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Basta apertar "Imprimir Carteirinha(s)" para abrir o diálogo nativo do sistema operacional.',
        ],
      },
    ],
  },
  history: {
    screenName: 'Relatórios de Frequência & Histórico Imutável',
    roleNotice: 'Foco: Coordenação Pedagógica e Auditoria',
    steps: [
      {
        title: 'Filtros Avançados por Intervalo de Datas',
        badge: 'Pesquisa Precisa',
        description:
          'Selecione períodos rápidos (Hoje, Ontem, Últimos 7 dias, Este Mês) ou escolha datas de início e fim específicas, filtrando simultaneamente por Turma ou Tipo de Evento.',
        icon: <Clock className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'A tabela exibe todos os eventos com carimbo de milissegundos registrado pelo terminal local.',
        ],
      },
      {
        title: 'Geração de Relatório PDF Padrão A4',
        badge: 'Documento Oficial',
        description:
          'Clique em "Gerar Relatório PDF" para visualizar a folha diagramada institucional com cabeçalho da escola, contagem analítica e lista de estudantes.',
        icon: <FileText className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Pronto para arquivamento impresso ou envio por e-mail para a mantenedora/secretaria de educação.',
        ],
      },
    ],
  },
  config: {
    screenName: 'Configurações e Painel do Sistema',
    roleNotice: 'Painel Unificado para Operador, Coordenação e Administrador TI',
    steps: [
      {
        title: 'Painel do Operador de Portaria',
        badge: 'Ajustes de Terminal',
        description:
          'Verifique a conexão do leitor de código de barras USB, faça testes dos bipes sonoros de confirmação e alerta, e consulte os atalhos de teclado.',
        icon: <Zap className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Pressione o botão de teste de áudio para garantir que o som do terminal está audível no ambiente da portaria.',
        ],
      },
      {
        title: 'Painel da Coordenação Pedagógica',
        badge: 'Regras de Negócio',
        description:
          'Configure a janela de tolerância para atrasos matutinos, o tempo de bloqueio contra leituras duplicadas acidentais (30s a 120s) e políticas de saída.',
        icon: <Sliders className="w-6 h-6 text-amber-600" />,
        tips: [
          'As alterações entram em vigor imediatamente na máquina local.',
        ],
      },
      {
        title: 'Painel do Administrador de TI (Local-First & SQLite)',
        badge: 'Resiliência e Dados',
        description:
          'Inspecione o estado do motor SQLite com WAL ativo, baixe backups completos do banco em formato JSON com 1 clique, simule modo offline e acompanhe a fila transacional Outbox.',
        icon: <HardDrive className="w-6 h-6 text-[#1e614f]" />,
        tips: [
          'Mesmo sem nenhuma conexão de rede, o terminal registra 100% dos eventos com garantia de idempotência para quando a internet voltar.',
        ],
      },
    ],
  },
};

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  currentTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const tourData = TAB_TOUR_DATA[currentTab] || TAB_TOUR_DATA.portaria;
  const currentStep = tourData.steps[currentStepIndex] || tourData.steps[0];
  const totalSteps = tourData.steps.length;

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

  return (
    <div className="fixed inset-0 bg-[#0f2125]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#dcd8cb] max-w-xl w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#f0ece2] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#edf5f2] border border-[#d6ebe3] text-[#1c5d4d] flex items-center justify-center shadow-2xs">
              <HelpCircle className="w-5 h-5 text-[#1e614f]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-[#172e33]">
                  Guia Rápido: {tourData.screenName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-heading bg-[#edf5f2] text-[#1c5d4d] border border-[#d6ebe3]">
                  Passo {currentStepIndex + 1} de {totalSteps}
                </span>
              </div>
              <p className="text-xs text-[#5f7477] mt-0.5">
                {tourData.roleNotice}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              setCurrentStepIndex(0);
            }}
            className="text-[#7c8f92] hover:text-[#182f33] p-1 rounded-lg hover:bg-[#faf8f4] transition-colors cursor-pointer"
            aria-label="Fechar guia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-1.5">
          {tourData.steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStepIndex
                  ? 'bg-[#1e614f]'
                  : idx < currentStepIndex
                  ? 'bg-[#489982]'
                  : 'bg-[#ede9de]'
              }`}
              title={`Ir para passo ${idx + 1}`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="p-5 rounded-2xl bg-[#faf8f5] border border-[#f0ece2] space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white border border-[#e5e1d5] shadow-2xs shrink-0">
              {currentStep.icon}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#7a8f92]">
                {currentStep.badge}
              </span>
              <h4 className="font-heading font-bold text-sm text-[#182f33]">
                {currentStep.title}
              </h4>
              <p className="text-xs text-[#526a6d] leading-relaxed">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Quick tips list */}
          <div className="space-y-2 pt-2 border-t border-[#ede9de]">
            <span className="text-[11px] font-heading font-bold text-[#1e614f] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Dicas Práticas de Uso:
            </span>
            <ul className="space-y-1.5 text-xs text-[#304447]">
              {currentStep.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1e614f] shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {currentStep.shortcut && (
            <div className="pt-2 border-t border-[#ede9de] flex items-center gap-2 text-xs text-[#5f7477]">
              <Keyboard className="w-3.5 h-3.5 text-[#7a8f92]" />
              <span>Atalhos: <strong className="font-mono text-[#182f33] bg-white px-2 py-0.5 rounded border border-[#dcd8cb]">{currentStep.shortcut}</strong></span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="px-3.5 py-2 rounded-lg border border-[#dcd8cb] text-xs font-semibold text-[#304447] disabled:opacity-30 hover:bg-[#faf8f4] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                setCurrentStepIndex(0);
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#7a8f92] hover:text-[#182f33] cursor-pointer"
            >
              Pular Guia
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg bg-[#1e614f] hover:bg-[#185041] text-white text-xs font-heading font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{currentStepIndex === totalSteps - 1 ? 'Concluir Guia' : 'Próximo Passo'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
