# DESIGN SYSTEM & GUIDELINES — Portaria Escolar Local-First
**Padrão de Design Institucional contra Slop de IA · v1.0**
*Baseado em `unslop` (Damir Sokolovsky), `hallmark` (Together AI) e `impeccable` (Philipp Bakaus)*

---

## 1. Princípio Fundamental: "Quiet Chrome, Rich Moments"

Sistemas operacionais de portaria escolar são ferramentas de missão crítica utilizadas por funcionários durante turnos inteiros de 8 a 12 horas. 

1. **O Cromo é Silencioso:** Barras de navegação, cabeçalhos, rodapés, bordas e fundos utilizam uma única rampa neutra e sóbria (Ardósia/Grafite Quente). Não há gradientes de cor no fundo, sombras brilhantes, glows ou bordas neon.
2. **A Riqueza Visual Pertence ao Momento da Decisão:** A cor e o foco concentram-se no momento do escaneamento — o cartão do aluno, a foto, o status de liberação (`Liberado` vs `Bloqueado/Alerta`) e os avisos de custódia da camada Mem0.

---

## 2. O "Floor" (Regras Inegociáveis)

Conforme definido pela especificação `hallmark`:

1. **Sem Rótulos em Caixa Alta Rastreada:** Proibido o uso de `tracking-widest uppercase` (ex: `OPERAÇÃO DE PORTARIA`, `MONITORAMENTO`). Rótulos, seções, cabeçalhos de tabela e navegação utilizam caixa mista (Sentence case) com peso médio (`font-medium text-xs`).
2. **Sem `transition: all`:** Transições devem ser explícitas e curtas (`transition-colors duration-150`, `transition-opacity duration-150`). Proibido animar dimensões estruturais (`width`, `height`, `top`, `left`).
3. **Sem Emojis como Ícones:** Toda a iconografia é padronizada na biblioteca Lucide, com tamanho consistente de 16px ou 18px e traço uniforme de 1.5px.
4. **Sem Pontos de Status Pulsantes Decorativos:** Eliminar `animate-pulse` em pontos verdes decorativos de status. Animações só existem para indicar carregamento real.
5. **Sem Gradientes de Texto ou Hue-Shifts:** Títulos e números possuem cores sólidas de alto contraste (mínimo 4.5:1 para texto normal, 7:1 para métricas críticas).
6. **Contenção e Alinhamento:** Todas as telas respeitam o grid estrito de 4px. Tabelas têm linhas com altura consistente de 40px ou 44px. Números utilizam fonte com caracteres tabulares (`tabular-nums font-mono`).

---

## 3. Rampa de Cores Semântica

### 3.1 Rampa Neutra (Ardósia Quente / Grafite)
- Fundo da aplicação: `#f5f6f8` (neutro limpo, não amarelado)
- Superfície de cartões: `#ffffff`
- Superfície de navegação (Sidebar): `#172327` (ardósia escuro institucional)
- Superfície ativa do menu: `#203338`
- Bordas estruturais: `#e2e5e9`
- Divisores sutis: `#edf0f2`

### 3.2 Tipografia Neutra
- Texto Principal: `#111827` (neutral-900 / alto contraste)
- Texto Secundário: `#4b5563` (neutral-600)
- Texto Mudo / Legendas: `#6b7280` (neutral-500)
- Texto no Sidebar: `#cbd5e1` (slate-300) / Ativo: `#ffffff`

### 3.3 Cores de Decisão (Portaria & Acesso)
- **Acesso Permitido (`ACCESS_GRANTED`):**
  - Superfície: `#f0fdf4` (green-50)
  - Borda: `#bbf7d0` (green-200)
  - Texto & Ícone: `#15803d` (green-700)
  - Badge sólido: `#16a34a` (green-600) com texto `#ffffff`
- **Acesso Bloqueado (`ACCESS_DENIED_BLOCKED`):**
  - Superfície: `#fef2f2` (red-50)
  - Borda: `#fecaca` (red-200)
  - Texto & Ícone: `#b91c1c` (red-700)
  - Badge sólido: `#dc2626` (red-600) com texto `#ffffff`
- **Requer Autorização / Alerta Médico (`REQUIRES_COORDINATION_OVERRIDE`):**
  - Superfície: `#fffbeb` (amber-50)
  - Borda: `#fde68a` (amber-200)
  - Texto & Ícone: `#b45309` (amber-700)
- **Anomalia / Scan Duplicado (`ANOMALY_DUPLICATE_SCAN`):**
  - Superfície: `#eff6ff` (blue-50)
  - Borda: `#bfdbfe` (blue-200)
  - Texto & Ícone: `#1d4ed8` (blue-700)

### 3.4 Cor de Destaque Institucional (Accent)
- Primária Institucional: `#0f766e` (teal-700) / Hover: `#0d5f59` (teal-800)
- Foco acessível: `focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2`

---

## 4. Escala Tipográfica & Espaçamento

- **Grid Base:** Múltiplos de 4px (4, 8, 12, 16, 20, 24, 32, 48px).
- **Tipografia:** 
  - Títulos de Páginas: `text-xl font-semibold text-neutral-900 tracking-tight`
  - Seções: `text-sm font-semibold text-neutral-800`
  - Rótulos / Form labels: `text-xs font-medium text-neutral-600`
  - Células de Tabela: `text-xs text-neutral-700`
  - Dados Numéricos / Matrículas / Horários: `font-mono tabular-nums text-neutral-900`
- **Linhas de Tabela:** Altura padrão de 40px a 44px, com alinhamento vertical estrito e padding horizontal de 16px.

---

## 5. Checklist de Verificação Anti-Slop (Auditoria)

Antes de aprovar qualquer tela para produção:
- [ ] O fundo da tela é sóbrio e sem gradientes vistosos?
- [ ] Não há nenhum texto em caixa alta rastreada (`uppercase tracking-widest`)?
- [ ] Todos os números utilizam `tabular-nums`?
- [ ] Nenhum elemento possui `transition: all`?
- [ ] Todos os botões e inputs possuem estado `:focus-visible` nítido?
- [ ] As mensagens de erro e sucesso são claras e explicativas (sem jargões ou emojis excessivos)?
- [ ] A tela mantém legibilidade perfeita em resolução 1024x768 e 1366x768 (telas padrão de portaria)?

