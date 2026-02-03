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
