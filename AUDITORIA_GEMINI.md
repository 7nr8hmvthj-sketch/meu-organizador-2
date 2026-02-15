# Auditoria de Código — Arquivos Críticos

**Autor:** Manus AI (Arquiteto de Software Sênior)  
**Data:** 15/02/2026  
**Escopo:** `server/db.ts`, `server/routers.ts`, `CalendarPage.tsx`, `WeeklyCalendarPage.tsx`  
**Objetivo:** Avaliar consistência de datas, segurança de validação e redundância de código.

---

## 1. Consistência — Lógica de "Data Pura" (sem fuso horário)

A aplicação utiliza colunas MySQL do tipo `DATE`, que armazenam apenas `YYYY-MM-DD` e descartam qualquer componente de horário. A consistência depende de todas as camadas tratarem datas da mesma forma.

### 1.1 Achados por Arquivo

| Arquivo | Função / Trecho | Abordagem | Veredicto |
|---------|----------------|-----------|-----------|
| `server/routers.ts` L46-49 | `parseDateSafe()` | Adiciona `T12:00:00Z` a strings de 10 caracteres | ✅ Correto para INSERT (MySQL ignora a hora) |
| `server/db.ts` L126-132 | `getEventsByUserId()` | Converte `Date → string` via `getUTCFullYear/Month/Date` | ✅ Correto |
| `server/db.ts` L135-146 | `getEventsByDateRange()` | Usa `new Date(startDate)` e `new Date(endDate)` sem `parseDateSafe` | ⚠️ **INCONSISTENTE** |
| `server/db.ts` L254-263 | `getMedicationLogsByDate()` | Usa `eq(medicationLogs.takenDate, new Date(date))` | ⚠️ **INCONSISTENTE** |
| `server/db.ts` L269-273 | `deleteMedicationLog()` | Usa `eq(medicationLogs.takenDate, new Date(date))` | ⚠️ **INCONSISTENTE** |
| `server/db.ts` L310-315 | `getDiaryEntry()` | Usa `sql\`DATE(...) = ${dateStr}\`` | ✅ Correto (solução definitiva) |
| `server/db.ts` L342-347 | `upsertDiaryEntry()` UPDATE | Usa `sql\`DATE(...) = ${dateStr}\`` | ✅ Correto |
| `server/db.ts` L350-356 | `upsertDiaryEntry()` INSERT | Usa `dateStr as any` | ✅ Funcional, mas tipagem forçada |
| `CalendarPage.tsx` L19-32 | `normalizeDateKey()` | Usa `getFullYear/Month/Date` (hora **local**) | ⚠️ Ver nota 1.2 |
| `WeeklyCalendarPage.tsx` L17-27 | `normalizeDateKey()` | Usa `toISOString().split('T')[0]` (hora **UTC**) | ⚠️ Ver nota 1.2 |

### 1.2 Problema Crítico: Duas Implementações Divergentes de `normalizeDateKey`

O `CalendarPage.tsx` extrai ano/mês/dia usando **hora local** do navegador (`getFullYear`, `getMonth`, `getDate`), enquanto o `WeeklyCalendarPage.tsx` usa `toISOString()` que converte para **UTC**. Para um usuário em UTC-3, um `Date` criado às 23:30 local (02:30 UTC do dia seguinte) produziria datas diferentes nos dois arquivos.

> **Severidade:** Alta. Pode causar eventos aparecendo em dias diferentes entre as duas telas.

> **Sugestão de Refatoração:** Extrair `normalizeDateKey` para um módulo compartilhado (`client/src/lib/dateUtils.ts`) com uma única implementação. A versão do `CalendarPage` (hora local) é a mais segura para o caso de uso, pois o usuário pensa em termos de dia local.

### 1.3 Funções de Medicação Vulneráveis ao Mesmo Bug do Diário

As funções `getMedicationLogsByDate` (L254) e `deleteMedicationLog` (L269) usam `eq(column, new Date(date))` para comparar com colunas do tipo `DATE`. Este é **exatamente o mesmo padrão** que causava o bug do diário (mismatch de horário). Ainda não manifestou problema visível porque o fluxo de medicação pode estar usando datas que coincidem com meia-noite, mas é uma bomba-relógio.

> **Severidade:** Média-Alta. Funcionará até que um timezone edge-case apareça.

> **Sugestão:** Aplicar a mesma solução do diário: `sql\`DATE(${column}) = ${dateStr}\``.

### 1.4 `getEventsByDateRange` Não Usa `parseDateSafe`

Na linha 142, `new Date(startDate)` e `new Date(endDate)` são passados diretamente sem `parseDateSafe`. Como a coluna é `DATE` e a comparação é `gte/lte` (não `eq`), o risco é menor, mas a inconsistência permanece.

> **Severidade:** Baixa. A comparação de range é mais tolerante que `eq`.

---

## 2. Segurança — Validação de `isPassed` na Rota `events.update`

### 2.1 Análise da Rota (`server/routers.ts` L116-138)

```typescript
update: protectedProcedure
  .input(z.object({
    id: z.number(),
    date: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    isPassed: z.boolean().optional(),
    passedReason: z.string().optional()
  }))
```

| Aspecto | Status | Observação |
|---------|--------|-----------|
| Validação de tipo (`z.boolean`) | ✅ | Zod rejeita valores não-booleanos |
| Campo opcional | ✅ | Não obriga envio, evita quebra de compatibilidade |
| Verificação de permissão | ⚠️ **PARCIAL** | Trainers não podem editar eventos de outros, **mas podem marcar `isPassed`** em eventos próprios |
| Sanitização de `passedReason` | ⚠️ | Aceita qualquer string sem limite de tamanho |

### 2.2 Problema: Trainer Pode Marcar `isPassed`

A rota `events.update` (L116) usa `protectedProcedure`, não `adminProcedure`. Embora treinadoras só possam editar eventos que criaram (L124-128), elas **podem** enviar `isPassed: true` na mutação de seus próprios treinos. A regra de negócio diz que apenas admin deveria marcar plantões como "Passado/Repassado".

> **Severidade:** Média. Na prática, trainers só editam Musculação/Pilates (não plantões), mas a brecha existe no backend.

> **Sugestão:** Adicionar guarda explícita:
> ```typescript
> if (data.isPassed !== undefined && ctx.user.role !== 'admin') {
>   throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admin pode marcar como passado.' });
> }
> ```

### 2.3 Rota `passShift` Usa `protectedProcedure` (L140-142)

A rota dedicada `passShift` também usa `protectedProcedure` ao invés de `adminProcedure`. Qualquer trainer autenticada poderia chamar esta rota diretamente e marcar qualquer plantão como passado.

> **Severidade:** Alta. Não há verificação de ownership nem de role.

> **Sugestão:** Trocar para `adminProcedure`.

### 2.4 `passedReason` Sem Limite de Tamanho

O campo `passedReason` aceita `z.string().optional()` sem `.max()`. Um payload malicioso poderia enviar strings muito longas.

> **Severidade:** Baixa (ambiente controlado com 3 usuários fixos).

> **Sugestão:** Adicionar `z.string().max(500).optional()`.

---

## 3. Redundância — Código Morto ou Repetido

### 3.1 Funções Duplicadas entre `CalendarPage` e `WeeklyCalendarPage`

| Função | CalendarPage | WeeklyCalendarPage | Idêntica? |
|--------|-------------|-------------------|-----------|
| `normalizeDateKey` | L19-32 | L17-27 | ❌ Divergente (ver seção 1.2) |
| `getEventColor` | L34-49 | L29-42 | ❌ Similar mas diferente (Calendar tem Home Care + Lembrete, Weekly não) |
| `getEventLabel` | L83-111 | L44-73 | ❌ Weekly tem early-return para intervalos, Calendar não |
| `extractTimeFromDescription` | L113-117 | L75-79 | ✅ Idêntica |
| `eventsByDate` (useMemo) | L210-222 | L154-172 | ✅ Lógica idêntica |
| `editableEvents` (useMemo) | L230-236 | L181-188 | ✅ Quase idêntica |

> **Severidade:** Média. 6 funções duplicadas significam 6 pontos de manutenção. Quando uma é corrigida, a outra pode ser esquecida (como aconteceu com `getEventColor` que não tem Home Care/Lembrete no Weekly).

> **Sugestão de Refatoração:** Criar `client/src/lib/eventUtils.ts` com todas as funções compartilhadas:
> ```
> eventUtils.ts
> ├── normalizeDateKey()
> ├── getEventColor()
> ├── getEventLabel()
> ├── extractTimeFromDescription()
> └── buildEventsByDateMap()
> ```

### 3.2 `WeeklyCalendarPage` Não Tem Cores para Home Care e Lembrete

O `getEventColor` do `WeeklyCalendarPage` (L29-42) **não inclui** as condições para "home care" e "lembrete" que foram adicionadas ao `CalendarPage` (L45-46). Se um evento desses tipos existir, cairá na cor padrão (slate) na visão semanal.

> **Severidade:** Baixa-Média. Inconsistência visual entre as duas telas.

### 3.3 `WeeklyCalendarPage` Não Filtra Lembretes

O `CalendarPage` tem filtro de privacidade (L159-165) que oculta Lembretes de trainers. O `WeeklyCalendarPage` (L102) **não tem esse filtro**. Uma trainer acessando a visão semanal veria Lembretes que deveriam ser privados.

> **Severidade:** Alta. Brecha de privacidade.

> **Sugestão:** Replicar o `useMemo` de filtro no `WeeklyCalendarPage` ou, melhor, filtrar no backend.

### 3.4 `SHIFT_HOURS` no CalendarPage (L51-64) — Código Potencialmente Morto

O dicionário `SHIFT_HOURS` mapeia nomes de plantão para horários, mas a função `getEventLabel` do `CalendarPage` já extrai horários diretamente do campo `type` (que contém "7-13", "13-19", etc.). O `SHIFT_HOURS` só seria usado se o tipo não contivesse horário explícito, o que é raro com os tipos atuais (`EVENT_TYPES` já incluem horários).

> **Severidade:** Baixa. Não causa bug, mas adiciona complexidade desnecessária.

### 3.5 `as any` no INSERT do Diário (L352)

```typescript
date: dateStr as any,
```

Funciona, mas suprime a verificação de tipo. Uma alternativa mais limpa seria usar `sql\`${dateStr}\`` ou ajustar o tipo no schema.

> **Severidade:** Baixa. Funcional mas não idiomático.

---

## 4. Resumo Executivo

| Categoria | Achados Críticos | Achados Médios | Achados Baixos |
|-----------|-----------------|----------------|----------------|
| **Consistência** | 1 (normalizeDateKey divergente) | 2 (medicação + dateRange) | 1 (as any) |
| **Segurança** | 1 (passShift sem adminProcedure) | 2 (isPassed sem guarda + trainer brecha) | 1 (passedReason sem max) |
| **Redundância** | 1 (filtro Lembrete ausente no Weekly) | 1 (6 funções duplicadas) | 2 (SHIFT_HOURS morto + cores faltando) |
| **TOTAL** | **3** | **5** | **4** |

---

## 5. Plano de Refatoração Sugerido (Priorizado)

### Prioridade 1 — Corrigir Agora

1. **Adicionar filtro de Lembretes no `WeeklyCalendarPage`** — Brecha de privacidade ativa
2. **Trocar `passShift` para `adminProcedure`** — Qualquer trainer pode marcar plantão como passado
3. **Adicionar guarda de role em `isPassed` no `events.update`** — Trainers não devem poder marcar como passado

### Prioridade 2 — Corrigir em Breve

4. **Unificar `normalizeDateKey`** em `client/src/lib/dateUtils.ts` — Evitar bugs de timezone entre telas
5. **Aplicar `DATE()` SQL nas funções de medicação** — Prevenir bug idêntico ao do diário
6. **Adicionar cores Home Care/Lembrete no `WeeklyCalendarPage`** — Consistência visual

### Prioridade 3 — Refatoração Técnica

7. **Extrair funções compartilhadas para `eventUtils.ts`** — Reduzir 6 pontos de manutenção para 1
8. **Remover ou consolidar `SHIFT_HOURS`** — Simplificar lógica de labels
9. **Substituir `as any` por tipagem correta** — Melhorar segurança de tipos
10. **Adicionar `.max(500)` ao `passedReason`** — Sanitização defensiva

---

**Nenhum código foi alterado.** Este relatório serve como base para decisão sobre quais refatorações executar.
