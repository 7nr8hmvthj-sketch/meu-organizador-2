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
