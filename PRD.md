# PRD — Portaria Escolar Local-First
**Product Requirements Document · v1.0 · Novembro 2026**

---

## 1. Visão Geral do Produto

**Portaria Escolar Local-First** é uma aplicação desktop Windows (`.exe`) que digitaliza e automatiza o controle de acesso de alunos nas portarias de escolas de educação básica. Roda 100 % offline no próprio computador da portaria — sem dependência de nuvem, servidor externo ou conexão de internet — e entrega decisões de entrada/saída em menos de 35 ms usando o motor de regras **Laya** combinado com a camada de memória contextual **Mem0**.

### Resumo técnico

| Camada | Tecnologia |
|--------|-----------|
| Interface | React 18 + Vite + TailwindCSS |
| Desktop shell | Electron (Chromium embutido) |
| Backend local | Express + TypeScript rodando no mesmo processo |
| Banco de dados | SQLite (modo WAL, zero-config) |
| Motor de decisão | Laya Decision Engine (< 35 ms) |
| Memória contextual | Mem0 Memory Layer |
| Empacotamento | electron-builder → NSIS Portable `.exe` |

---

## 2. Problema

As escolas públicas e privadas de pequeno e médio porte enfrentam três problemas críticos na portaria:

1. **Risco de segurança:** Responsáveis não autorizados ou suspeitos conseguem retirar alunos por falta de verificação sistemática.
2. **Sobrecarga operacional:** Porteiros consultam listas em papel, planilhas desatualizadas ou dependem de ligação para a secretaria — criando filas e atrasos.
3. **Falta de rastro:** Não há registro auditável de quem entrou/saiu e qual foi a decisão tomada, impossibilitando investigações posteriores.

### Oportunidade

Um sistema local-first elimina a latência de rede, funciona mesmo em escolas sem internet estável, e entrega ao porteiro uma decisão clara e fundamentada em menos de um segundo — reduzindo erros humanos e tempo de fila.

---

## 3. Personas e Hierarquia de Usuários

### 3.1 Operador de Portaria (`operator`)
- **Perfil:** Porteiro ou recepcionista; ensino médio; baixa familiaridade com tecnologia.
- **Objetivo:** Verificar rapidamente se o aluno pode sair e com quem; registrar o evento.
- **Acesso:** Terminal de Portaria, Carteirinhas.
- **Necessidade crítica:** Resultado visual e sonoro instantâneo — verde/vermelho sem ambiguidade.

### 3.2 Coordenação (`coordinator`)
- **Perfil:** Coordenador pedagógico ou vice-diretor; domina Excel; acessa dados de turmas.
- **Objetivo:** Visualizar frequência, gerir alunos/turmas/responsáveis, revisar ocorrências.
- **Acesso:** Tudo do Operador + Dashboard, Alunos, Turmas, Responsáveis, Relatórios.
- **Necessidade crítica:** Visão consolidada de presença e alertas pendentes.

### 3.3 Administrador TI (`admin`)
- **Perfil:** Coordenador TI ou diretor; entende configurações de sistema.
- **Objetivo:** Configurar a escola, gerir usuários do sistema, ver logs de auditoria.
- **Acesso:** Tudo da Coordenação + Usuários, Configurações do Sistema.
- **Necessidade crítica:** Controle total sem acesso externo.

---

## 4. Objetivos e Não-Objetivos

### ✅ Objetivos (v1.0)

- Verificar identidade de aluno por token (carteirinha QR/NFC/matrícula) em < 35 ms
- Exibir decisão de acesso com fundamentos e memórias contextuais (Mem0)
- Registrar evento de presença auditável no banco local
- Funcionar 100 % offline, sem dependência de rede
- Sidebar filtrada por papel do usuário (operator / coordinator / admin)
- Executável único `.exe` portátil para Windows 10/11 x64
- Interface em Português Brasileiro

### ❌ Não-Objetivos (v1.0)

- Sincronização em nuvem ou multi-escola em rede
- Aplicativo mobile ou PWA
- Reconhecimento facial ou biometria
- Integração com sistemas de secretaria estadual (SIGE, SIGAE etc.)
- Multi-tenancy (múltiplas escolas no mesmo `.exe`)

---

## 5. Funcionalidades

### 5.1 Terminal de Portaria

**Descrição:** Tela principal do operador. Aceita token de entrada manual, leitura de QR ou NFC.

**Fluxo principal:**
1. Operador digita/escaneia token do aluno.
2. Backend resolve token → busca aluno + responsáveis + memórias Mem0.
3. Laya Engine avalia regras (bloqueios, alertas de custódia, duplicidade de scan, horário).
4. Resultado exibido em < 35 ms: `ACCESS_GRANTED`, `ACCESS_DENIED_BLOCKED`, `REQUIRES_COORDINATION_OVERRIDE`, `ANOMALY_DUPLICATE_SCAN`.
5. `Mem0ContextCard` exibe alertas críticos, responsáveis autorizados e notas gerais.
6. Evento registrado em `attendance_events` + enfileirado em `outbox_items`.

**Critérios de aceite:**
- Latência p99 < 35 ms (medida em `gate_decision_logs.latency_ms`)
- Cor de fundo da resposta: verde (#16a34a) para acesso, vermelho (#dc2626) para negado
- Som cue retornado pela API: `allow` ou `deny`
- Fallback para banco local se backend estiver temporariamente indisponível

### 5.2 Gestão de Alunos

**Descrição:** CRUD de alunos com vínculo a turma e responsáveis.

**Campos obrigatórios:** nome completo, matrícula, turma, status (ativo/inativo/suspenso).
**Campos opcionais:** foto, observações médicas, CPF (hash SHA-256 no DB).
**Critérios de aceite:**
- Busca por nome ou matrícula com debounce de 300 ms
- Atualização de status reflete imediatamente nas decisões da portaria

### 5.3 Gestão de Responsáveis (Mem0)

**Descrição:** Cadastro de responsáveis com vinculação a alunos; notas contextuais salvas via Mem0.

**Tipos de memória Mem0:**
| Tipo | Exemplo |
|------|---------|
| `custody_restriction` | "Pai (José) não autorizado por decisão judicial" |
| `health_alert` | "Aluno alérgico a amendoim — carry Epipen" |
| `authorized_pickup` | "Avó Maria (cel. 11 9xxxx-xxxx) autorizada" |
| `general_note` | "Aluno pode sair antes das 17h às sextas" |

**Critérios de aceite:**
- Memórias do tipo `custody_restriction` e `health_alert` bloqueiam ou alertam automaticamente no terminal
- Notas exibidas no `Mem0ContextCard` com ícone e cor por tipo

### 5.4 Carteirinhas / Badges

**Descrição:** Gerador de carteirinhas imprimíveis para alunos.

**Critérios de aceite:**
- QR Code embutido com token único do aluno
- Preview A6 antes de imprimir
- Impressão em lote por turma

### 5.5 Relatórios

**Descrição:** Visualizações de frequência e histórico de portaria.

**Relatórios v1.0:**
- Frequência diária por turma
- Histórico de entrada/saída por aluno (últimos 30 dias)
- Log de decisões da portaria com filtro por resultado
- Exportação CSV

**Critérios de aceite:**
- Geração de relatório diário < 2 s para até 500 alunos
- CSV com codificação UTF-8 BOM (compatível com Excel em PT-BR)

### 5.6 Controle de Acesso Baseado em Papel (RBAC)

**Descrição:** Sidebar dinâmica que exibe apenas as seções permitidas ao papel atual.

| Seção | operator | coordinator | admin |
|-------|:--------:|:-----------:|:-----:|
| Terminal de Portaria | ✅ | ✅ | ✅ |
| Carteirinhas | ✅ | ✅ | ✅ |
| Dashboard | — | ✅ | ✅ |
| Alunos | — | ✅ | ✅ |
| Turmas | — | ✅ | ✅ |
| Responsáveis | — | ✅ | ✅ |
| Relatórios | — | ✅ | ✅ |
| Usuários | — | — | ✅ |
| Configurações | — | — | ✅ |

**Critérios de aceite:**
- Troca de papel reflete em < 100 ms sem reload de página
- Navegação direta a URL não permitida redireciona ao terminal

### 5.7 Resiliência Offline e Outbox

**Descrição:** Eventos registrados localmente nunca se perdem; `outbox_items` serve como fila para sincronização futura.

**Critérios de aceite:**
- Backend indisponível → frontend usa `localDatabase.ts` como fallback
- Outbox persiste eventos não reconhecidos com `acked = 0`
- Endpoint `GET /api/outbox` retorna fila pendente para futura integração

---

## 6. Arquitetura Técnica

### 6.1 Visão Geral

```
┌─────────────────────────────────────────────────┐
│                 Electron Shell                  │
│  ┌────────────────┐    ┌──────────────────────┐ │
│  │  React 18 SPA  │◄──►│  Express + SQLite     │ │
│  │  Vite + Tailwind│   │  :3002  (WAL mode)   │ │
│  │  :3001 (dev)   │    │  Laya Engine          │ │
│  │  dist/ (prod)  │    │  Mem0 Memory Layer   │ │
│  └────────────────┘    └──────────────────────┘ │
│                                                  │
│  IPC: contextBridge (preload.ts)                │
└─────────────────────────────────────────────────┘
              │
         SQLite WAL
    data/escola_local.db
```

### 6.2 Motor de Decisão Laya

Localização: [`backend/src/services/layaDecisionService.ts`](backend/src/services/layaDecisionService.ts)

**Regras avaliadas em sequência (short-circuit):**

| Prioridade | Condição | Resultado |
|-----------|----------|-----------|
| 1 | Aluno não encontrado | `ACCESS_DENIED_BLOCKED` |
| 2 | `student.status === 'suspended'` | `ACCESS_DENIED_BLOCKED` |
| 3 | Memória `custody_restriction` ativa | `ACCESS_DENIED_BLOCKED` |
| 4 | Scan duplicado no mesmo dia | `ANOMALY_DUPLICATE_SCAN` |
| 5 | Memória `health_alert` crítica | `REQUIRES_COORDINATION_OVERRIDE` |
| 6 | Aluno ativo, sem impedimentos | `ACCESS_GRANTED` |

Latência registrada em `gate_decision_logs.latency_ms`; meta p99 < 35 ms.

### 6.3 Camada de Memória Mem0

Localização: [`backend/src/services/mem0MemoryService.ts`](backend/src/services/mem0MemoryService.ts)

Mem0 é um repositório de memórias semânticas por entidade (aluno/responsável). No contexto local-first, as memórias são armazenadas em `context_memories` e recuperadas por `entity_id`. A arquitetura é compatível com futura integração ao Mem0 Cloud API (`mem0ai` SDK) para memória persistente multi-dispositivo.

### 6.4 Modelo de Dados (Resumo)

```sql
schools              -- configuração da escola (1 linha)
classrooms           -- turmas (série + turno)
students             -- alunos (status: active|inactive|suspended)
guardians            -- responsáveis legais
student_guardians    -- N:M aluno ↔ responsável (is_primary, is_authorized)
student_identifiers  -- tokens de scan (QR, NFC, matrícula, opaque)
attendance_events    -- log de presença (entry/exit + decision)
gate_decision_logs   -- decisões Laya com latência
context_memories     -- memórias Mem0 por entidade
outbox_items         -- fila de eventos para sincronização futura
audit_logs           -- trilha de auditoria de todas as mutações
```

Todos os campos CPF/token armazenados como **hash SHA-256**. WAL mode + `PRAGMA foreign_keys = ON` + índices em todos os campos de busca frequente.

### 6.5 Empacotamento Electron

| Artefato | Tamanho | Localização |
|----------|---------|------------|
| Pasta unpacked | ~249 MB | `dist_electron/win-unpacked/` |
| Portable `.exe` | ~124 MB | `Portaria Escolar Local-First.exe` (raiz) |
| Script launcher | — | `Iniciar-Portaria-Escolar.bat` (raiz) |
| Atalho `.lnk` | — | `Portaria Escolar Local-First.lnk` (raiz) |

Build: `bun run build:all` → Vite build + esbuild Electron + electron-builder NSIS Portable.

---

## 7. Requisitos Não-Funcionais

| Requisito | Meta | Como medido |
|-----------|------|------------|
| Latência de decisão (p99) | < 35 ms | `gate_decision_logs.latency_ms` |
| Tempo de boot do `.exe` | < 5 s | Medida manual em cold start |
| Throughput portaria | ≥ 10 scans/min sem degradação | Teste de carga local |
| Tamanho do `.exe` portátil | < 200 MB | electron-builder output |
| Offline-first | 100 % funcional sem rede | Desligar adaptador de rede em teste |
| Consumo de RAM | < 300 MB em uso normal | Windows Task Manager |
| Compatibilidade | Windows 10/11 x64 | QA manual |
| Segurança de dados | CPF/tokens como SHA-256 no DB | Auditoria de schema |

---

## 8. Requisitos de Segurança

1. **Dados pessoais:** CPF e tokens biométricos nunca armazenados em texto claro — apenas hash SHA-256.
2. **Sem telemetria:** O `.exe` não realiza nenhuma chamada de rede externa. Toda comunicação é `localhost`.
3. **Auditoria:** Toda mutação de dado (criação/edição/exclusão) gera registro em `audit_logs` com timestamp e `operator_id`.
4. **Acesso físico:** Recomenda-se que o computador da portaria tenha senha de Windows e bloqueio automático por inatividade (5 min).
5. **Backup:** Recomenda-se cópia diária automática de `data/escola_local.db` para pendrive ou pasta de rede.
6. **Modelos de IA:** Se integrações futuras carregarem modelos locais, utilizar exclusivamente formato `.safetensors`.

---

## 9. Métricas de Sucesso

| Métrica | Meta v1.0 |
|---------|----------|
| Latência p99 de scan | < 35 ms |
| Taxa de erro na portaria | < 1 % dos scans |
| Adoção por operadores | > 90 % dos scans via sistema (vs papel) |
| Reclamações de lentidão | 0 em 30 dias de uso |
| Incidentes de acesso indevido | 0 (decisão Laya acertada) |

---

## 10. Roadmap e Issues em Aberto

### v1.1 — Integração Mem0 Cloud
- Sincronização de memórias contextuais com API Mem0 (`mem0ai` SDK)
- Histórico de memórias multi-dispositivo

### v1.2 — Sincronização e Multi-Escola
- Outbox → sincronização com servidor central via REST (quando online)
- Dashboard web para gestão de múltiplas unidades

### v1.3 — Autenticação Real
- Substituir seletor de papel demonstrativo por login com senha (bcrypt)
- Sessões com JWT de vida curta (30 min)
- Bloqueio por tentativas incorretas

### v1.4 — Biometria e NFC
- Integração com leitores NFC USB (node-nfc / nfc-pcsc)
- Suporte a leitor de impressão digital (WebUSB ou driver nativo)

### Issues em Aberto

| # | Descrição | Prioridade |
|---|-----------|-----------|
| 1 | Ícone `.ico` personalizado para o `.exe` (usar logo da escola) | Média |
| 2 | `vite.config.ts` warning `__dirname` → migrar para `import.meta.dirname` | Baixa |
| 3 | `Iniciar-Portaria-Escolar.bat` iniciar backend automaticamente | Média |
| 4 | Relatório de frequência em PDF (via `puppeteer` headless no Electron) | Alta |
| 5 | Tela de login real substituindo o seletor demonstrativo | Alta |
| 6 | Teste de carga: 500 alunos, 10 scans/min, 8h contínuas | Alta |

---

## 11. Glossário

| Termo | Definição |
|-------|----------|
| **Laya Engine** | Motor de regras de decisão de acesso com latência < 35 ms |
| **Mem0** | Camada de memória contextual semântica por entidade (aluno/responsável) |
| **WAL** | Write-Ahead Logging — modo SQLite que permite leituras concorrentes sem bloquear escritas |
| **Outbox** | Padrão transacional de fila local para garantir entrega de eventos ao sincronizar com servidor |
| **Token** | Identificador único de scan: pode ser matrícula, código QR, tag NFC ou hash opaco |
| **Local-First** | Paradigma onde todos os dados e lógica residem no dispositivo; rede é opcional |
| **NSIS Portable** | Formato de `.exe` auto-extraível que não requer instalação — basta executar |

---

*Documento gerado automaticamente em Novembro de 2026 a partir da implementação atual do projeto.*
*Localização: `c:\Users\Maycon\Desktop\Sistema-Escolar-Local-MVP-main\PRD.md`*

