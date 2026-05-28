# Meu Organizador Pessoal - TODO

## Funcionalidades Implementadas

- [x] Sistema de login com credenciais fixas (USER/Wert123.)
- [x] Dashboard inteligente com saudação dinâmica e estatísticas
- [x] Gestão de escala profissional (adicionar, editar, cancelar plantões)
- [x] Funcionalidade de passar plantão com campo de motivo
- [x] Eventos passados tachados com cores apagadas e observações em amarelo
- [x] Calendário mensal interativo com navegação entre meses
- [x] Controle financeiro com contas fixas e variáveis
- [x] Checkbox para marcar contas como pagas
- [x] Resumo visual do status financeiro
- [x] Checklist de medicamentos com barra de progresso
- [x] Reset automático do checklist à meia-noite
- [x] Página 'Hoje' com agenda e medicamentos
- [x] Persistência de dados em banco de dados
- [x] Alternância modo escuro/claro com persistência
- [x] Importação de dados do CSV do Plantãozinho
- [x] Sincronização de plantões passados

## Implementação Sistema de Treinos (Em Andamento)

- [x] Importar CSV completo atualizado (286 eventos)
- [x] Adicionar eventos de natação fixa (seg 20:45, ter 11:40, qua 20:45, sex 20:45, sáb 12:10)
- [x] Criar sistema de autenticação para JESSICA (personal) e ISA (pilates) - senha: 123
- [x] Reformular calendário para mostrar "EVENTO HORÁRIO" em vez de bolinhas
- [x] Criar interface de calendário exclusiva para personal/instrutora
- [x] Adicionar modal "Inserir Treino" com opções Musculação/Pilates
- [x] Adicionar campo de horário e descrição no modal de treino
- [x] Implementar cores diferenciadas para Musculação e Pilates
- [ ] Testar sistema completo com os 3 tipos de usuário (USER, JESSICA, ISA)

## Correções Solicitadas

- [x] Investigar natação duplicada (não há duplicatas no banco, nem eventos de natação)
- [x] Adicionar horários dos plantões na visualização do calendário (13-19, 7-13, 19-7, etc)
- [x] Adicionar 260 eventos de natação para 2026

## Bugs Reportados (31/01/2026)

- [x] Erro de links aninhados (<a> dentro de <a>) na página /calendario
- [x] Natação duplicada - verificado: não há duplicatas no banco
- [x] Data errada ao inserir treino - corrigido problema de timezone
- [x] HC e Zona Norte sem horário - adicionados horários padrão (7-13, 13-19, 19-7)

## Melhorias Sugeridas (31/01/2026)

### Banco de Dados
- [x] Atualizar "Zona Norte (Manhã)" para "ZN 7-13"
- [x] Atualizar "Zona Norte (Tarde)" para "ZN 13-19"
- [x] Atualizar "HC Manhã" para "HC 7-13"
- [x] Atualizar "HC Tarde" para "HC 13-19"
- [x] Remover duplicatas de natação (636 removidas)

### Backend (routers.ts)
- [x] Adicionar função parseDateSafe para corrigir timezone
- [x] Adicionar middleware protectedProcedure
- [x] Adicionar middleware adminProcedure
- [x] Proteger rotas de finanças com adminProcedure
- [x] Proteger rotas de medicamentos com adminProcedure

### Frontend (CalendarPage.tsx)
- [x] Usar getEventLabel simplificado
- [x] Adicionar função normalizeDateKey
- [x] Adicionar deduplicação com Set
- [x] Adicionar validação de horário no modal
- [x] Usar key={e.id} ao invés de índice
- [x] Adicionar botão "Hoje"

## Correção de Horários HC/ZN (31/01/2026)

- [x] Implementar regex melhorada para capturar formatos HH:MM e H-H
- [x] Adicionar mapeamento SHIFT_HOURS como fallback para turnos sem horário explícito
- [x] Testar no site agendaintegrada.xyz com usuário ISA
- [x] Corrigir conversão de data no db.ts para usar métodos UTC (getUTCFullYear, getUTCMonth, getUTCDate)

## Edição/Exclusão de Treinos (31/01/2026)

- [x] Adicionar campo createdBy no schema de eventos
- [x] Atualizar backend para salvar quem criou o treino
- [x] Implementar modal de edição de treinos
- [x] Implementar exclusão de treinos
- [x] Restringir edição/exclusão apenas para treinos criados pela própria treinadora

## Bug Crítico de Datas (01/02/2026)

- [x] Investigar dados brutos no banco - verificar formato exato das datas
- [x] Identificar padrão do deslocamento - problema de timezone na importação do CSV
- [x] Corrigir causa raiz - reimportar CSV usando apenas data local (YYYY-MM-DD)
- [x] Recriar natação usando SQL puro com DAYOFWEEK correto
- [x] Verificar manualmente - todos os eventos de fevereiro estão corretos

## Correção Visibilidade de Observações (01/02/2026)

- [x] Permitir que treinadoras vejam observações de treinos criados uma pela outra

## Bug Login Intermitente (01/02/2026)

- [x] Corrigir "Página não encontrada" após primeiro login - erro intermitente

## Edição de Eventos pelo Calendário (01/02/2026)

- [x] Permitir que admin (USER) edite qualquer evento clicando no dia do calendário
- [x] Criar modal de visualização/edição de eventos do dia para admin
- [x] Implementar edição de nome, data, horário e descrição de eventos
- [x] Implementar exclusão de eventos pelo calendário
- [x] Manter funcionalidade atual das treinadoras (apenas treinos próprios)

## Correção Visualização de Eventos Passados para Treinadoras (01/02/2026)

- [x] Mostrar eventos passados com estilo riscado no modal das treinadoras
- [x] Adicionar observação "Passado" em amarelo igual ao modal do admin
- [x] Manter consistência visual entre os dois tipos de modal

## Calendário Semanal para Treinadoras (01/02/2026)

- [x] Criar página de calendário semanal otimizada para smartphone
- [x] Layout com 6 dias (segunda a sábado, sem domingo)
- [x] Visualização vertical com cada dia ocupando mais espaço
- [x] Navegação por semana (anterior/próxima)
- [x] Manter lógica de adicionar, editar e excluir treinos
- [x] Usar mesmo banco de dados e padrões visuais
- [x] Redirecionar treinadoras automaticamente para esta página ao logar

## Frontend Financeiro (01/02/2026)

- [x] Criar tabela de despesas no banco de dados (expenses)
- [x] Implementar routers tRPC para CRUD de despesas
- [x] Criar página de gestão financeira com dashboard de resumo
- [x] Implementar listagem de despesas fixas e variáveis
- [x] Adicionar funcionalidade de marcar como pago
- [x] Implementar botão "Virar Mês" para reiniciar status de pagamento
- [x] Adicionar modal de criação/edição de despesas

## Diário Pessoal (02/02/2026)

- [x] Criar tabela diary_entries no banco de dados
- [x] Implementar routers tRPC para CRUD de entradas
- [x] Criar página DiaryPage.tsx com editor markdown
- [x] Adicionar navegação por data (dia anterior/próximo)
- [x] Implementar sistema de tags para categorização
- [x] Adicionar busca por palavra-chave
- [x] Filtro por tag na lista de entradas
- [x] Preview do diário no modal de eventos do calendário
- [x] Link direto do calendário para o diário do dia
- [x] Restringir acesso apenas para USER (admin)

## Correção Visualização Diário (03/02/2026)

- [x] Melhorar visualização de entradas passadas no modal "Ver Entradas"
- [x] Exibir conteúdo completo das entradas (não apenas preview)
- [x] Adicionar scroll ou expandir conteúdo truncado

## Correção Key Duplicada Diário (03/02/2026)

- [x] Corrigir erro de keys duplicadas no modal de entradas
- [x] Usar ID ao invés de data como key única

## Correções DiaryPage e CalendarPage (03/02/2026)

- [x] Corrigir DiaryPage: texto sumindo após salvar (problema de recarregamento)
- [x] Adicionar função extractTimeFromDescription no CalendarPage
- [x] Corrigir link para diário no CalendarPage

## Sincronização GitHub (03/02/2026)

- [x] Puxar alterações do commit 9cee872 do GitHub
- [x] Aplicar correções definitivas do Diário

## Correções Definitivas Diário - Bug Fuso Horário e Texto Sumindo (04/02/2026)

- [x] DiaryPage: Forçar T12:00:00 na data para evitar bug de fuso horário (dia 4 virando dia 3)
- [x] DiaryPage: Implementar lastLoadedDateRef para impedir texto sumindo ao salvar
- [x] CalendarPage: Garantir formato de data consistente com banco de dados
- [x] CalendarPage: Adicionar extractTimeFromDescription no escopo correto

## Correções Frontend Teimoso - Diário (04/02/2026)

- [x] DiaryPage: Implementar lógica de "frontend teimoso" que não apaga conteúdo durante carregamento
- [x] DiaryPage: Priorizar conteúdo em memória sobre resposta do banco após salvar
- [x] DiaryPage: Visualização instantânea olha apenas para campos de texto (title, content)
- [x] CalendarPage: Query robusta para buscar diário no calendário
- [x] CalendarPage: Botão "Abrir Diário Completo" com formato de data correto

## Correções Definitivas Fuso Horário - Diário (04/02/2026)

- [x] DiaryPage: Forçar T12:00:00 na URL para evitar fuso horário jogar data para dia anterior
- [x] DiaryPage: Implementar lastLoadedDateRef para impedir limpeza durante salvamento
- [x] DiaryPage: Atualizar tela imediatamente com dados salvos (fallback para dados locais)
- [x] DiaryPage: Lógica blindada que só limpa campos se data mudou E banco retornou vazio
- [x] CalendarPage: Botão "Abrir Diário" usa format(selectedDate, 'yyyy-MM-dd') para garantir data correta
- [x] CalendarPage: Query trpc.diary.get usa selectedDateKey formatada corretamente

## Correções Manipulação Data String (04/02/2026)

- [x] DiaryPage: Implementar toLocalISODate para extrair YYYY-MM-DD sem conversão UTC
- [x] DiaryPage: Usar dateKey (string) ao invés de Date object para queries
- [x] DiaryPage: Lógica blindada com lastLoadedKeyRef para evitar limpeza durante salvamento
- [x] DiaryPage: Atualização imediata do estado local após salvamento bem-sucedido
- [x] CalendarPage: Implementar normalizeDateKey para garantir formato consistente
- [x] CalendarPage: Usar normalizeDateKey em todas as operações de data (queries, navegação, eventos)

## Investigação Bug Visualização Diário (04/02/2026)

- [x] Investigar como data é salva no banco (server/db.ts - upsertDiaryEntry)
- [x] Investigar como data é buscada do banco (server/db.ts - getDiaryEntry)
- [x] Verificar formato de data no schema (drizzle/schema.ts - diary_entries)
- [x] Corrigir comparação de datas entre frontend (YYYY-MM-DD string) e backend
- [x] Garantir que query trpc.diary.get use mesmo formato que foi salvo
- [x] Aplicar mesma solução de eventos (new Date com T12:00:00Z)

## Investigação Profunda Bug Diário - Entradas Não Aparecem (04/02/2026)

- [x] Verificar dados reais no banco (SELECT * FROM diary_entries) - formato exato da coluna date
- [x] Comparar query de list (funciona) vs query de get (não funciona)
- [x] Analisar conversão de data no retorno (getUTCFullYear, getUTCMonth, getUTCDate)
- [x] Verificar se problema está na comparação ou na conversão de retorno
- [x] Testar query SQL direta no banco para confirmar dados existem
- [x] Descoberta: MySQL DATE ignora hora ao salvar, retorna meia-noite ao ler
- [x] Solução: Usar DATE() SQL function para comparar apenas parte de data

## Ajuste Visual Calendário (04/02/2026)

- [x] Aumentar altura mínima dos dias de 110px para 180px
- [x] Exibir até 6 eventos por dia ao invés de 3
- [x] Atualizar contador de eventos ocultos para refletir nova capacidade

## Otimização de Layout - Full Width & Compact (06/02/2026)

- [x] Expandir largura geral em App.tsx (remover container centralizado)
- [x] Otimizar altura do calendário em CalendarPage.tsx (reduzir padding e min-height)
- [x] Otimizar diário em DiaryPage.tsx (expandir largura e compactar espaçamento)

## Novos Tipos de Eventos e Privacidade (06/02/2026)

- [x] Adicionar "Home Care" e "Lembrete" em EVENT_TYPES
- [x] Adicionar cores para Home Care (teal/ciano) e Lembrete (cinza)
- [x] Implementar filtro de privacidade para Lembretes (ocultar de trainers)

## Visualização de Horários e Status Passado (08/02/2026)

- [x] Atualizar getEventLabel em WeeklyCalendarPage.tsx para exibir período completo
- [x] Adicionar campo isPassed no backend (server/routers.ts)
- [x] Adicionar campo passedReason no backend (server/routers.ts)
- [x] Implementar UI com checkbox de Passado em CalendarPage.tsx
- [x] Atualizar função handleUpdateEvent para incluir isPassed

## Correções Auditoria P1+P2 (15/02/2026)

- [x] Filtro de Lembretes no WeeklyCalendarPage (privacidade)
- [x] passShift para adminProcedure (segurança)
- [x] Criar dateUtils.ts com normalizeDateKey unificada (consistência)
- [x] Refatorar CalendarPage e WeeklyCalendarPage para usar dateUtils.ts
- [x] Adicionar cores Home Care e Lembrete no WeeklyCalendarPage (visual)

## Bug Grid Calendário Desalinhado (15/02/2026)

- [ ] Corrigir desalinhamento cabeçalho vs grid de datas no CalendarPage.tsx

## Correção DATE() SQL em Medicamentos (15/02/2026)

- [x] Corrigir getMedicationLogsByDate para usar DATE() SQL
- [x] Corrigir deleteMedicationLog para usar DATE() SQL

## Correção Parser CSV na Aba Comparação (16/02/2026)

- [x] Aceitar delimitadores ; e , no CSV
- [x] Converter datas DD/MM/AAAA para YYYY-MM-DD
- [x] Adicionar logs de erro detalhados no backend
- [ ] Testar upload e visualização de divergências

## Debug Parser CSV - Erro Persistente (16/02/2026)

- [x] Adicionar console.log das primeiras 3 linhas do CSV recebido
- [x] Adicionar log do Content-Type do arquivo
- [x] Melhorar mensagem de erro no catch para mostrar error.message
- [x] Criar teste.csv de exemplo para validar lógica isoladamente
- [x] Validar parser isoladamente - FUNCIONA CORRETAMENTE
- [ ] Testar upload novamente e verificar erro real no frontend

## Calculador de Horas ZN no Dia 19 (16/02/2026)

- [x] Adicionar função calculateZNHours antes de export default function CalendarPage()
- [x] Adicionar caixinha visual no dia 19 do calendário
- [ ] Testar contabilização de horas (período 20 a 19, ignora repassados e HC)

## Correção Plantões 2º e 4º Sábados - Original da Bruna (21/02/2026)

- [x] Buscar eventos com descrição "original da bruna" (não encontrados)
- [x] Calcular 2º e 4º sábados de fevereiro a dezembro/2026
- [x] Inserir 22 plantões noturnos (19-07) com descrição "original da bruna" nesses sábados


## Migração para Supabase PostgreSQL (01/03/2026)

- [x] Backup frio do banco TiDB (592 registros: 3 users + 589 events)
- [x] Refatoração de drivers: remover mysql2, instalar postgres
- [x] Refatoração schema.ts: mysqlTable → pgTable
- [x] Refatoração db.ts: mysql2 → postgres-js driver
- [x] Configuração SSL e prepare: false para Connection Pooler
- [x] Criação de tabelas no Supabase (users, events, expenses, medications, etc)
- [x] Injeção de 589 eventos no Supabase
- [x] Mapeamento de colunas: camelCase → lowercase (userId → userid, etc)
- [x] Verificação com Drizzle: 5 eventos retornados corretamente
- [ ] Correção de erro 400 na API (tRPC query parameters)
- [ ] Correção de erro de sincronização de usuário
- [ ] Teste completo do calendário com eventos do Supabase
- [ ] Teste de autenticação (USER, JESSICA, ISA)

## Sistema de Recorrência Avançada (04/03/2026)

- [x] Implementar createManyEvents() em server/db.ts
- [x] Adicionar rota createMany em server/routers.ts
- [x] Adicionar estados de recorrência em CalendarPage.tsx
- [x] Implementar lógica de cálculo de datas (semanal/mensal)
- [x] Adicionar UI de recorrência no modal
- [ ] Testar recorrência semanal
- [ ] Testar recorrência mensal por semanas específicas
- [ ] Criar checkpoint e publicar

## Correcao de Duplo Disparo (05/03/2026)

- [x] Adicionar disabled={isPending || isLoading} ao botao "Salvar" do modal Novo Evento
- [x] Adicionar disabled={isPending || isLoading} ao botao "Salvar" do modal Novo Treino
- [x] Adicionar feedback visual "Salvando..." durante a requisicao
- [ ] Publicar versao corrigida em producao

## Correcao de Bug de Estado na Edicao (14/03/2026)

- [x] Corrigir matching por substring em handleEditEventClick
- [x] Implementar matching estrito (t.value === event.type)
- [x] Testar edicao de ZN 7-13 e ZN 13-19 para confirmar correcao
- [ ] Publicar versao corrigida em producao

## Migracao de Banco de Dados - Cores e Horarios (14/03/2026)

- [x] Atualizar schema da tabela events (drizzle/schema.ts)
- [x] Adicionar colunas startTime, endTime, color
- [x] Atualizar routers (create, createMany, update)
- [x] Executar migracao com bypass de TLS (scripts/migracao_manual.ts)
- [x] Validar que as 3 colunas foram criadas com sucesso
- [ ] Atualizar frontend para usar novos campos (ETAPA 2)

## ETAPA 2 - Frontend (Cores e Horarios) (15/03/2026)

- [x] Adicionar estados startTime, endTime, eventColor
- [x] Adicionar paleta PREDEFINED_COLORS
- [x] Atualizar handleEditEventClick para carregar novos campos
- [x] Atualizar handleAddEvent para incluir novos parametros
- [x] Atualizar JSX do modal "Novo Evento" com inputs de horario e cores
- [x] Atualizar renderizacao de eventos para exibir cores personalizadas
- [x] Atualizar renderizacao para exibir startTime e endTime
- [ ] Publicar em producao


## Plano Mestre de Aprimoramento (27/04/2026)

### Fase 1: Gerenciador de Categorias Dinâmico
- [x] Criar tabela `categories` no banco (id, name, color, type)
- [x] Migração manual via script (bypass TLS)
- [x] Backend: Router categories (list, create, update, delete)
- [x] Script de seed para popular categorias existentes (HC, ZN, Pilates, etc.)
- [x] Frontend: Componente CategoryManager.tsx
- [x] Substituir PREDEFINED_COLORS e EVENT_TYPES por dados do banco
- [x] Checkpoint Fase 1

### Fase 2: Filtros Avançados de Visualização
- [x] Toggle/Switch no topo do calendário (Todos, Plantões, Pessoal/Saúde)
- [x] Atualizar useMemo de events para filtrar por toggle
- [x] Cálculo ZN não afetado pelos filtros (usa allEvents)
- [x] Checkpoint Fase 2

### Fase 3: Integração Financeira Básica (Dashboard)
- [x] Função backend para somar horas de plantão do mês (monthlySummary route)
- [x] Tabela expenses criada no banco de dados remoto
- [x] Painel recolhível (Collapsible) com horas por tipo (ZN/HC/Noturno/Apoio)
- [x] Estimativa de ganhos com R$/hora editável (localStorage)
- [x] Cruzamento: Total Horas vs Despesas Fixas vs Saldo Estimado
- [x] Testes vitest passando (13/13)
- [x] Checkpoint Fase 3

### Fase 4: Refatoração de Login
- [ ] Mapear lógica atual de VALID_CREDENTIALS
- [ ] Script para inserir usuários na tabela users com hash seguro
- [ ] Alterar auth.simpleLogin para validar via banco
- [ ] Testar exaustivamente login com credenciais antigas
- [ ] Checkpoint Fase 4

## Hotfix Crítico - Função Faltante db.ts (28/04/2026)

- [x] Adicionar getDiaryEntriesByUserId no server/db.ts
- [x] Adicionar searchDiaryEntries no server/db.ts
- [x] Adicionar getUserPreferences no server/db.ts
- [x] Adicionar upsertUserPreferences no server/db.ts
- [x] Verificar routers.ts para garantir chamadas corretas
- [x] Adicionar createMedication, updateMedication, deleteMedication no db.ts
- [x] Corrigir deleteEvent (1 arg), upsertDiaryEntry (objeto), takenDate (string)

## Recalibração Regras Financeiras (28/04/2026)

- [x] ZN/Noturno/Apoio/Corredor: R$136/h, ciclo 20-19
- [x] HC: R$108/h, atraso 120 dias (mês X-4)
- [x] Backend: retornar totalZN e totalHC separados (monthlySummary reescrito)
- [x] UI: Exibir detalhamento ZN (ref 20/mês_ant a 19/mês_atual) e HC (ref 120 dias)
- [x] Testes vitest: 34/34 passando (financialRules.test.ts)
- [x] Checkpoint e publicação

## Ajuste HC 90 dias (28/04/2026)

- [x] Backend: Alterar month-4 para month-3 no cálculo HC
- [x] Frontend: Alterar label para "90 dias de atraso"
- [x] Testes vitest atualizados (34/34)
- [x] Checkpoint e publicação

## Inclusão 'Observação' no Grupo ZN (28/04/2026)

- [x] Backend: 'observação' já incluído na identificação ZN (confirmado)
- [x] Frontend: 'observação' já incluído no cálculo ZN (confirmado)
- [x] R$136/h e ciclo 20-19 mantidos para observação
- [x] Todos os 82 testes passando (6 arquivos)
- [x] Checkpoint e publicação

## Substituir Corredor por Observação no Painel Financeiro (28/04/2026)

- [x] Backend: Trocar 'corredor' por 'observação' no breakdown ZN
- [x] Frontend: Trocar label 'Corredor' por 'Observação' no painel
- [x] Checkpoint e publicação

## Conciliação Horas RH vs Sistema (28/04/2026)

- [x] Criar tabela monthly_adjustments (id, userId, month, year, rhHoursZN, rhHoursHC)
- [x] Migração manual da tabela
- [x] Backend: getAdjustment e upsertAdjustment rotas tRPC
- [x] Frontend: inputs RH no painel financeiro (ZN e HC)
- [x] Cálculo de diferença (vermelho/verde)
- [x] Salvamento automático (onBlur)
- [x] Total Recebimentos e Saldo usam valor RH quando preenchido
- [x] Persistência testada: valor 150h salvo, recarregou com R$ 20.400
- [x] Testes vitest: 12/12 passando (rhConciliation.test.ts)
- [x] Checkpoint e publicação

## Fase 4: Refatoração de Login via Banco de Dados (28/04/2026)

- [x] Instalar bcryptjs para hash de senhas
- [x] Criar tabela app_users separada (username, password_hash, role, user_id)
- [x] Criar script seed_auth.ts para migrar 4 usuários com hash
- [x] Refatorar auth.simpleLogin para validar via banco (bcrypt.compare)
- [x] Fallback testado e removido - auth 100% via DB
- [x] Criar rota auth.createUser (admin only) com senha criptografada
- [x] Verificar isolamento de dados por userId em todas as queries (47 referências OK)
- [x] Testar login exaustivo com USER, JESSICA, ISA, VEGANO (todos OK via curl)
- [x] Remover VALID_CREDENTIALS após confirmação total
- [x] Testes vitest: 16/16 passando (authDb.test.ts)
- [x] Checkpoint e publicação

## HOTFIX CRÍTICO: Vazamento de Dados entre Usuários (28/04/2026)

- [x] Investigar cookie/sessão: userId correto no login (dbUser.user_id OK)
- [x] Auditar events.list: userId hardcoded como 1 → CORRIGIDO para ctx.user.userId
- [x] events.listByDateRange: hardcoded 1 → ctx.user.userId
- [x] events.create: hardcoded 1 → ctx.user.userId
- [x] events.createMany: hardcoded 1 → ctx.user.userId
- [x] events.update: hardcoded 1 → ctx.user.userId
- [x] events.passShift: hardcoded 1 → ctx.user.userId + ctx adicionado
- [x] events.undoPass: hardcoded 1 → ctx.user.userId
- [x] events.cancel: hardcoded 1 → ctx.user.userId
- [x] events.undoCancel: hardcoded 1 → ctx.user.userId
- [x] events.list e listByDateRange: publicProcedure → protectedProcedure
- [x] Auditar expenses, monthly_adjustments, diaryEntries, medications (já usavam ctx.user.userId)
- [x] Testar isolamento: VEGANO=0 eventos, USER=810 eventos
- [x] Publicar correção em produção

## Delegação de Acesso para Trainers (28/04/2026)

- [x] Helper getEffectiveUserId: trainer→1, outros→ctx.user.userId
- [x] Aplicar nas 10 rotas de events (list, listByDateRange, create, createMany, update, passShift, undoPass, cancel, undoCancel, delete)
- [x] Testar: JESSICA=810 eventos, VEGANO=0 eventos, USER=810 eventos
- [x] Checkpoint e publicação

## HOTFIX: Conflito FK e Categorias para Novos Usuários (01/05/2026)

- [x] Inserir GIOVANA (userId=3) na tabela `users` para satisfazer FK
- [x] Atualizar auth.createUser para inserir em `users` E `app_users` (dual-insert)
- [x] Categorias são globais (sem filtro userId) - todos os usuários já veem todas
- [x] Testar criação de evento com conta GIOVANA (ZN 7-13, id=31540, deletado após teste)
- [x] Isolamento confirmado: GIOVANA vê apenas seus eventos (1), USER vê 810
- [x] Checkpoint e publicação

## Fase 1: Refatoração UI/UX Modal de Eventos (01/05/2026)

### 1A: Tipos de Evento
- [x] Dropdown com tipos globais fixos: PORTA, OBSERVAÇÃO, ENFERMARIA, SALA, HOME CARE, Personalizado
- [x] Remover tipos hardcoded antigos
- [x] Adaptar financeiro: PORTA e SALA → grupo ZN, ENFERMARIA → grupo HC

### 1B: Categorias Personalizadas Isoladas
- [x] Alterar tabela categories para aceitar userId (null = global)
- [x] Opção "Personalizado" abre input de texto
- [x] Salvar tipo personalizado atrelado ao ctx.user.userId
- [x] Tipos personalizados aparecem apenas para o dono

### 1C: Quick Time Select
- [x] Botões de atalho: 7-13, 13-19, 7-19, 19-01, 19-07
- [x] Auto-fill dos campos startTime e endTime
- [x] Horário continua opcional

### 1D: Checkpoint Fase 1
- [x] Testar criação de evento personalizado
- [x] Testar salvamento de categoria isolada
- [x] Testar auto-fill de horários
- [x] Checkpoint

## Fase 2: Tela de Registro VIP (Invite Code)

### 2A: Backend
- [x] Rota auth.registerWithCode (publicProcedure)
- [x] Validação inviteCode (AGENDA2026 → user, TRAINER2026 → trainer)
- [x] Hash bcrypt + dual-insert (users + app_users)

### 2B: Frontend
- [x] Alternador 'Criar nova conta' / 'Já tenho conta'
- [x] 3 inputs: USUÁRIO, SENHA, CÓDIGO
- [x] Toast erro/sucesso + auto-login

### 2C: Checkpoint Fase 2
- [x] Testar código errado (deve falhar)
- [x] Testar código correto (deve passar)
- [x] Checkpoint e publicação

## Correções Urgentes (06/05/2026)

- [x] Fix: MobileCalendar exibir lista de eventos ao clicar no dia (inline, sem Dialog)
- [x] Fix: Renomear menu lateral - "Mensal" para agenda mensal, "Semanal" para agenda semanal
- [x] Fix: Adicionar Domingo ao calendário semanal (WeeklyCalendarPage)
- [x] Fix: Novos usuários (ex: Yana) sem acesso ao menu lateral - corrigir filtro adminOnly
- [x] Fix: Bolinhas do desktop devem ficar iguais às do mobile (tamanho, disposição, estilo)
- [x] Fix: Desktop - clique no dia mostra eventos inline abaixo do calendário (sem popup)
- [x] Feat: Adicionar coluna 'value' (numeric) à tabela events no schema
- [x] Feat: Atualizar rotas tRPC para aceitar campo 'value' em criação/edição de eventos
- [x] Feat: Adicionar input de valor (R$) nos formulários de novo/editar evento
- [x] Feat: Exibir valor formatado (R$ X,XX) na visualização de eventos

## Refatoração Motor Financeiro (06/05/2026)

- [ ] Fix: Refatorar calcHours - contar isPassed, ignorar isCancelled
- [ ] Fix: Implementar prioridade para value fixo nos eventos
- [ ] Fix: Normalizar datas e case-insensitive workplaceId
- [ ] Fix: Aplicar value fixo aos unlinkedRates

## Correção Permissões Workplaces (10/05/2026)

- [x] Corrigir getNextAppUserId no db.ts: retornava string em vez de número, bloqueando registro de novos usuários
- [x] Confirmar que isRestrictedUser no CalendarPage.tsx está correto para novos admins (JORDANA, EMANUELA, etc.)
- [x] Confirmar que workplaces.create funciona para qualquer admin registrado com sucesso

## Liberação de Workplaces para Todos os Usuários (10/05/2026)

- [x] Alterar workplaces.create/getAll/update/delete de adminProcedure para protectedProcedure
- [x] Liberar saveAdjustment e unlinkedRates para protectedProcedure também
- [x] Garantir userId: ctx.user.userId na criação e filtro where userId na listagem
- [x] Remover bloqueios visuais no CalendarPage (isRestrictedUser corrigido para isTrainer || PAULA)
- [x] Confirmar que dropdown de Local de Trabalho no CalendarPage e WeeklyCalendarPage já é visível para todos
- [x] Confirmar que rota /financeiro já é acessível para role=user no App.tsx

## Correção de Cálculo de Horas e Cache (10/05/2026)

- [x] Corrigir cálculo de horas para plantões que cruzam meia-noite no getMonthlySummary
- [x] Adicionar invalidação de cache workplaces.getMonthlySummary nas mutações events.create/update/delete

## 3 Correções do Motor Financeiro (11/05/2026)

- [x] Correção 1: overrideHours=0 não deve zerar horas reais (usar || null em vez de truthy check)
- [x] Correção 2: cycleEndDay=31 gerava datas inválidas (03-32, 04-31) — usar lastDay real do mês
- [x] Correção 3: parseHoursFromText com lógica em minutos para intervalos genéricos

## Correção Ciclo Multimensal HC (11/05/2026)

- [x] Corrigir isolamento multi-tenant: getEffectiveUserId usa lookup dinâmico por username (JESSICA, ISA) em vez de regra genérica de role=admin. GIOVANA e outros admins novos vêem apenas a própria agenda.
- [x] Corrigir workedMonth para workplaces com paymentDelayMonths > 1 (HC=3 meses: maio → fevereiro ✓)

## Correções Críticas Calendário (11/05/2026)

- [x] Confirmar que .map() já usa key={e.id} em ambos os calendários; adicionar deduplicacao por id em normalizeEvents
- [x] Corrigir getEffectiveUserId: admins secundários (JESSICA userId=150023, ISA userId=150024) agora vêem agenda do admin principal (userId=1)
- [x] Resultado validado: JESSICA retorna 587 eventos após correção

## Correção de Horários na Agenda Semanal (12/05/2026)

- [x] Lembretes e eventos personalizados agora exibem horários na WeeklyCalendarPage (startTime renderizado)
- [x] Adicionado renderização de startTime em ambas as seções: "Eventos neste dia" e "Seus treinos"

## BLOQUEIO CRÍTICO: JESSICA não abre agenda mensal (12/05/2026)

- [x] Corrigido: JESSICA e ISA removidas de RESTRICTED_UI_USERS no App.tsx (apenas PAULA agora). Ambas vão ver Mensal, Semanal, Financeiro. Diário/Medicamentos continuam bloqueados via DIARY_RESTRICTED_USERS.

## Bug Nome Duplicado no Modal do Dia (17/05/2026)

- [x] Corrigir handleUpdateEvent: description não deve usar type como fallback
- [x] Corrigir handleAddTraining/handleUpdateTraining: description não deve usar trainingType como fallback
- [x] Limpeza visual retroativa no Modal do Dia: não exibir description se igual ao type

## Responsividade dos Modais (17/05/2026)

- [x] CalendarPage: limitar largura dos modais (max-w-[95vw] sm:max-w-md) e adicionar scroll interno (max-h-[65vh] overflow-y-auto)
- [x] WeeklyCalendarPage: adicionar scroll interno nos formulários dos modais (max-h-[65vh] overflow-y-auto)

## Layout Responsivo dos Botões de Horário nos Modais (17/05/2026)

- [x] CalendarPage: botões rápidos de horário — substituir flex space-x-2 por flex flex-wrap gap-2
- [x] CalendarPage: campos Início/Fim — substituir flex space-x-2 por grid grid-cols-2 gap-4 e remover flex-1
- [x] CalendarPage: mesma correção na seção de Divisão de Horas (showShiftDivider)

## Bug Exclusão em Série (27/05/2026)

- [x] Corrigir deleteEventSeries: adicionar filtro DAYOFWEEK para não excluir eventos de outros dias da semana com mesmo type/startTime

## Módulo Financeiro - Mockup Visual (28/05/2026)

- [x] Refatorar FinancialDashboard.tsx com 3 abas: Plantões (funcional), Empresa PJ (mockup + total real), Pessoal PF (placeholder)
- [x] Aba Plantões: motor de cálculo, locais de trabalho e plantões avulsos preservados
- [x] Aba PJ: card "A Receber" exibe total real do getMonthlySummary
- [x] Aba PF: placeholder para fase futura
- [x] Integrar botão "💰 Financeiro" no header do CalendarPage.tsx (já existe)
- [x] Integrar botão "💰 Financeiro" no header do WeeklyCalendarPage.tsx (já existe)
- [x] Refatorar Finance.tsx (página principal) com 3 abas: Plantões, Empresa PJ, Pessoal PF
- [x] Aba PJ na página principal: card "A Receber" exibe total real do getMonthlySummary

## ALERTA SEV 1 - Vazamento de Dados (28/05/2026)

- [x] SEGURANÇA: Corrigir vazamento de dados financeiros entre usuários (restringir abas PJ/PF a admin)
- [x] Remover "Aluguel" da aba Plantões e mover para aba PF (Moradia e Consumo)
- [x] Tornar botões "Pagar" e "Editar" funcionais nas abas PJ e PF (estado local + modal edição)
