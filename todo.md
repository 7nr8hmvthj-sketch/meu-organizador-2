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
