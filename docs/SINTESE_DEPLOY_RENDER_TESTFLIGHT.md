# Síntese de Deploy e Retomada — Meu Organizador 2026

**Autor:** Manus AI  
**Data:** 04 de junho de 2026  
**Projeto:** Meu Organizador 2026 / AGENDA  
**Estado atual:** em **stand by**, aguardando ativação da conta Apple Developer paga.

## 1. Resumo executivo

O projeto **Meu Organizador 2026** avançou de um ambiente local para uma arquitetura adequada ao teste em iPhone físico por meio do **TestFlight**. O ponto mais importante foi resolver a dependência de `localhost`: como um iPhone físico não consegue acessar o backend local do Mac pelo endereço `localhost`, o backend foi publicado em uma URL pública com HTTPS no Render, permitindo que o app iOS compilado via Capacitor se comunique com a API em produção.

O backend está online e respondendo em `https://meu-organizador-api-q9fc.onrender.com`. O build iOS já foi regenerado no Mac virtual apontando para essa API pública por meio de `VITE_API_BASE_URL`. O Xcode está aberto com o projeto sincronizado, mas o processo de distribuição ainda não pode continuar porque a conta Apple Developer, embora inscrita e paga, ainda aparece como **não ativada**. Enquanto a Apple não liberar a Team paga no Xcode e no App Store Connect, não é possível gerar o Archive válido para TestFlight.

> **Definição operacional:** a tarefa está pronta para ser retomada assim que a conta Apple Developer aparecer como Team paga no Xcode. Até lá, não há pendência técnica crítica no backend ou no build Capacitor; o bloqueio atual é exclusivamente administrativo na Apple.

## 2. O que foi concluído

A primeira frente concluída foi o deploy do backend. O servidor Node.js/TypeScript com tRPC foi publicado no Render como serviço web permanente, com `NODE_ENV=production`, `PORT=10000`, `DATABASE_URL` apontando para o PostgreSQL do Supabase, `JWT_SECRET` gerado e códigos de convite configurados. A rota de saúde da API foi testada e retornou estado positivo, confirmando que o backend está ativo.

A segunda frente concluída foi a integração com o banco existente. O projeto usa o Supabase PostgreSQL já utilizado pela agenda, preservando os dados reais. Não foi criado um banco novo. Como a senha do banco foi exposta anteriormente no chat, há uma ação de segurança obrigatória para depois da estabilização: **resetar a senha no Supabase e atualizar o `DATABASE_URL` no Render**.

A terceira frente concluída foi a preparação do app iOS. No Mac virtual, o arquivo `.env.local` foi criado com `VITE_API_BASE_URL=https://meu-organizador-api-q9fc.onrender.com`; em seguida, o frontend foi recompilado e os assets foram sincronizados com o projeto iOS via Capacitor. O Xcode foi aberto com o projeto atualizado. O Capacitor é o caminho oficial usado para empacotar uma aplicação web em um projeto nativo iOS, e o comando de sincronização copia os assets web e atualiza a estrutura nativa necessária.[2] [4]

| Área | Resultado atual | Evidência operacional |
|---|---|---|
| Backend público | **Concluído** | API ativa em `https://meu-organizador-api-q9fc.onrender.com` |
| Healthcheck | **Concluído** | `GET /api/trpc/system.health` retorna `ok: true` |
| Banco Supabase | **Concluído** | `DATABASE_URL` configurado no Render apontando para PostgreSQL existente |
| Build web para iOS | **Concluído** | `pnpm build` executado com a API pública |
| Sincronização Capacitor | **Concluída** | `npx cap sync ios` executado com sucesso |
| Xcode | **Aberto e pronto para assinatura** | Projeto iOS carregado no Mac virtual |
| Apple Developer | **Pendente** | Conta inscrita e paga, mas Team paga ainda não aparece |
| TestFlight | **Aguardando desbloqueio** | Depende de assinatura válida e criação do app no App Store Connect |

## 3. Estado técnico consolidado

O app está dividido em frontend React/Vite, backend Node.js/tRPC e banco PostgreSQL. Para o iPhone físico, a arquitetura correta é: app iOS instalado via TestFlight, acessando a API pública HTTPS no Render, que por sua vez usa o banco Supabase existente. Essa arquitetura remove a dependência do Mac local e é compatível com testes reais fora do simulador.

| Componente | Configuração atual | Observação |
|---|---|---|
| Repositório | `7nr8hmvthj-sketch/meu-organizador-2` | Branch principal usada no deploy e no build iOS |
| Backend | Render Web Service | Start command: `node dist/index.js` |
| API pública | `https://meu-organizador-api-q9fc.onrender.com` | Deve permanecer como base URL do app iOS |
| Banco | Supabase PostgreSQL | Usar o banco existente, sem criar outro |
| Variável iOS | `VITE_API_BASE_URL=https://meu-organizador-api-q9fc.onrender.com` | Deve existir antes de `pnpm build` |
| Origem Capacitor | `capacitor://localhost` | Origem esperada do app iOS empacotado |
| Distribuição iPhone | TestFlight | Necessita Apple Developer ativa e App Store Connect |

A escolha por uma API pública HTTPS é essencial porque builds distribuídos pelo TestFlight precisam funcionar independentemente do Mac virtual. A Apple recomenda o uso do App Store Connect para gerenciar apps e builds, enquanto o TestFlight é o canal de distribuição beta usado para instalar e testar builds antes da publicação final.[5] [6]

## 4. Diferença entre o plano antigo e o plano atual

O manual anterior ainda continha trechos voltados a simulador local, nos quais `VITE_API_BASE_URL` apontava para `http://localhost:3000`. Esse fluxo foi útil durante o desenvolvimento, mas não serve para iPhone físico quando o app é instalado fora do ambiente do Mac. No iPhone, `localhost` significa o próprio aparelho, não o computador de desenvolvimento.

| Cenário | Base URL correta | Quando usar |
|---|---|---|
| Desenvolvimento no navegador do Mac | `http://localhost:3000` | Testes locais rápidos |
| Simulador iOS no Mac | `http://localhost:3000` ou API pública | Útil enquanto o backend roda localmente |
| iPhone físico sem TestFlight, na mesma rede | IP local do Mac, como `http://192.168.x.x:3000` | Apenas quando há USB/rede local e backend rodando no Mac |
| iPhone físico via TestFlight | `https://meu-organizador-api-q9fc.onrender.com` | **Plano atual e recomendado** |
| App Store futura | API HTTPS pública ou domínio próprio | Etapa posterior ao beta |

Portanto, para a próxima retomada, o roteiro principal não deve voltar ao `localhost`. O build iOS deve continuar apontando para a API pública no Render, salvo se houver decisão explícita de trocar o domínio ou migrar a hospedagem.

## 5. Manual de retomada quando a Apple Developer ativar

Assim que a Apple ativar a conta, a retomada deve começar pela confirmação de que a Team paga aparece nos sistemas da Apple. O Xcode é a ferramenta oficial para criar, assinar, arquivar e enviar builds iOS, enquanto o App Store Connect é o ambiente usado para cadastrar o app, processar builds e disponibilizá-los via TestFlight.[1] [5] [6]

### 5.1 Verificar ativação da conta

A primeira verificação deve ser feita em `https://developer.apple.com/account` e em `https://appstoreconnect.apple.com`. No Xcode, acessar **Settings > Accounts** e confirmar que a conta Apple mostra uma Team paga, não apenas **Personal Team**. Se a Team paga ainda não aparecer, ainda estamos bloqueados e não vale a pena tentar Archive para TestFlight.

| Verificação | Resultado esperado |
|---|---|
| Apple Developer Account | Membership ativo |
| App Store Connect | Acesso liberado à criação de apps |
| Xcode > Settings > Accounts | Team paga visível |
| Xcode > Signing & Capabilities | Team paga selecionável |

### 5.2 Reabrir o projeto no Mac virtual, se necessário

Se o Xcode continuar aberto, basta usar a janela atual. Caso o Mac virtual tenha sido reiniciado ou o Xcode fechado, usar a sequência abaixo:

```bash
cd ~/meu-organizador-2
printf 'VITE_API_BASE_URL=https://meu-organizador-api-q9fc.onrender.com\n' > .env.local
pnpm install
pnpm build
npx cap sync ios
npx cap open ios
```

O comando `pnpm install` só é indispensável se as dependências não estiverem instaladas ou se o ambiente tiver sido recriado. O mais importante é garantir que `.env.local` esteja correto **antes** de executar `pnpm build`, porque o Vite embute a variável no bundle gerado.

### 5.3 Configurar assinatura no Xcode

No Xcode, clicar no projeto **App** no painel esquerdo e abrir **Signing & Capabilities**. Em seguida, marcar **Automatically manage signing**, selecionar a Team paga e confirmar o **Bundle Identifier**. O Bundle Identifier precisa ser único no ecossistema Apple; uma sugestão simples é `com.meuorganizador.app`, desde que esteja disponível.

| Campo | Valor recomendado | Observação |
|---|---|---|
| Automatically manage signing | Marcado | Facilita certificados e provisioning profiles |
| Team | Team paga da conta Apple Developer | Não usar Personal Team para TestFlight |
| Bundle Identifier | `com.meuorganizador.app` ou equivalente disponível | Deve ser o mesmo no App Store Connect |
| Version | `1.0.0` ou versão inicial escolhida | Pode ser ajustada antes do Archive |
| Build | Número incremental, como `1` | Deve subir a cada novo envio |

### 5.4 Criar o app no App Store Connect

No App Store Connect, criar um novo app iOS com o mesmo Bundle Identifier configurado no Xcode. Esta etapa conecta o projeto assinado no Xcode ao cadastro do app que receberá o build. O TestFlight faz parte do App Store Connect e é usado para disponibilizar versões beta a testadores internos ou externos.[5] [6]

| Campo no App Store Connect | Orientação |
|---|---|
| Plataforma | iOS |
| Nome | Meu Organizador 2026, ou nome final desejado |
| Idioma principal | Português do Brasil, se disponível |
| Bundle ID | Mesmo Bundle Identifier do Xcode |
| SKU | Identificador interno simples, por exemplo `meu-organizador-2026` |

### 5.5 Gerar Archive

No Xcode, selecionar como destino **Any iOS Device (arm64)**, não um simulador. Depois, acessar **Product > Archive**. O Archive é o pacote assinado que será enviado para processamento pela Apple. Se aparecer erro de assinatura, a causa mais provável será Team incorreta, Bundle Identifier indisponível ou conta Apple ainda sem permissão completa.

| Possível erro | Correção provável |
|---|---|
| Team não aparece | Aguardar ativação Apple ou reiniciar login no Xcode |
| Bundle Identifier indisponível | Escolher outro identificador e atualizar também no App Store Connect |
| Provisioning profile falha | Manter assinatura automática e conferir Team paga |
| Archive tenta usar simulador | Trocar destino para **Any iOS Device (arm64)** |

### 5.6 Enviar para TestFlight

Quando o Archive terminar, o Xcode abrirá o Organizer. Selecionar o Archive gerado, clicar em **Distribute App**, escolher **App Store Connect** e seguir o fluxo de upload. Após o envio, o build pode levar alguns minutos para ser processado antes de aparecer no TestFlight. A Apple descreve o TestFlight como o mecanismo para convidar usuários e testar apps beta antes da distribuição pública.[6]

Depois que o build aparecer processado, adicionar o Apple ID do iPhone como testador interno, se a conta permitir, ou como testador externo. No iPhone, instalar o aplicativo **TestFlight** pela App Store, aceitar o convite e instalar o build.

## 6. Checklist de retomada rápida

Esta tabela resume a sequência exata para a próxima sessão. Ela deve ser seguida em ordem para evitar retrabalho.

| Ordem | Ação | Status esperado |
|---:|---|---|
| 1 | Confirmar ativação em `developer.apple.com/account` | Membership ativo |
| 2 | Confirmar acesso ao App Store Connect | Permite criar app |
| 3 | Confirmar Team paga no Xcode | Team aparece em Accounts e Signing |
| 4 | Garantir `.env.local` com API do Render | `VITE_API_BASE_URL=https://meu-organizador-api-q9fc.onrender.com` |
| 5 | Rodar `pnpm build` | Build web sem erro |
| 6 | Rodar `npx cap sync ios` | Assets sincronizados no iOS |
| 7 | Configurar Signing & Capabilities | Team paga e Bundle ID definidos |
| 8 | Criar app no App Store Connect | App iOS cadastrado com mesmo Bundle ID |
| 9 | Selecionar **Any iOS Device (arm64)** | Destino correto para Archive |
| 10 | Rodar **Product > Archive** | Archive gerado |
| 11 | Enviar via Organizer | Build enviado ao App Store Connect |
| 12 | Aguardar processamento | Build aparece no TestFlight |
| 13 | Adicionar testador | Apple ID do iPhone convidado |
| 14 | Instalar no iPhone pelo TestFlight | App testável no aparelho físico |
| 15 | Testar login, agenda, diário e eventos | Validar fluxo real com API pública |

## 7. Validações pós-instalação no iPhone

Após instalar pelo TestFlight, os primeiros testes devem confirmar que o app está realmente usando a API pública e que os fluxos principais continuam funcionando. Como o backend já está no Render, o iPhone não precisa estar na mesma rede do Mac virtual.

| Área testada | O que validar | Resultado esperado |
|---|---|---|
| Abertura do app | App carrega sem tela infinita | Interface inicial aparece |
| Autenticação | Login com usuário admin ou trainer | Sessão criada normalmente |
| Agenda mensal/semanal | Eventos carregam | Dados reais aparecem |
| Diário | Entrada por data aparece corretamente | Comparação por data funciona |
| Lembretes | Admin vê, trainers não veem | Regra de privacidade preservada |
| Plantões | Horário completo exibido | Exemplo: `ZN 7-13` |
| Evento repassado | Checkbox salva estado | Preparar validação visual futura |
| API | Sem erro de rede | Chamadas vão para domínio do Render |

## 8. Segurança e estabilização após o primeiro TestFlight

Depois que o primeiro build estiver instalado e validado, a prioridade deve ser reduzir risco operacional. A senha do banco Supabase foi exposta anteriormente durante a configuração; por isso, ela deve ser resetada no Supabase, e o novo `DATABASE_URL` precisa ser atualizado no Render. Não é recomendável repetir a senha antiga em novos chats, documentos ou prints.

A sequência segura é: gerar nova senha no Supabase, copiar a nova connection string, atualizar a variável `DATABASE_URL` no Render, redeployar o serviço e testar novamente a rota de saúde. Em seguida, abrir o app no iPhone e confirmar que a agenda ainda carrega normalmente.

| Ação de segurança | Quando fazer | Observação |
|---|---|---|
| Resetar senha do Supabase | Após primeiro build TestFlight estar funcional | Evita quebrar o deploy antes do teste inicial |
| Atualizar `DATABASE_URL` no Render | Imediatamente após o reset | Usar a nova senha do pooler PostgreSQL |
| Redeployar backend | Após salvar a variável | Confirma que o serviço usa a nova credencial |
| Testar healthcheck | Após redeploy | `system.health` deve retornar `ok: true` |
| Testar app no iPhone | Após healthcheck | Confirma integração completa |

## 9. Pendências funcionais para depois do TestFlight

O objetivo imediato é colocar o app no iPhone físico. Depois disso, podem ser retomadas melhorias do produto, especialmente aquelas já mapeadas no projeto AGENDA.

| Prioridade | Melhoria | Motivo |
|---|---|---|
| Alta | Estilo visual para plantões `isPassed: true` | Completar a funcionalidade de “Passado/Repassado” |
| Média | Filtro para ocultar/mostrar plantões repassados | Melhorar leitura da agenda |
| Média | Undo de repasse por alguns segundos | Reduzir erro operacional |
| Média | Comparação CSV versus agenda | Encontrar divergências em plantões |
| Baixa/Média | Notificações de lembretes | Requer decisão sobre email, push ou notificação interna |
| Pós-beta | Preparar App Store pública | Exige descrição, screenshots, política de privacidade e revisão |

Essas melhorias não bloqueiam o TestFlight. O recomendado é primeiro validar o ciclo completo de instalação no iPhone e uso real com backend público; depois, evoluir a experiência visual e operacional.

## 10. Critério objetivo para sair do stand by

A retomada deve acontecer quando as quatro condições abaixo estiverem verdadeiras. Se qualquer uma falhar, o projeto continua em espera.

| Condição | Como verificar |
|---|---|
| Conta Apple Developer ativa | `developer.apple.com/account` mostra membership ativo |
| App Store Connect acessível | Permite criar app iOS |
| Team paga aparece no Xcode | Xcode > Settings > Accounts e Signing & Capabilities |
| Backend Render saudável | `https://meu-organizador-api-q9fc.onrender.com/api/trpc/system.health` responde `ok: true` |

Enquanto a Apple Developer não ativar a conta, a melhor decisão é manter o ambiente como está, sem tentar refazer builds desnecessariamente. A próxima ação produtiva será configurar assinatura e TestFlight assim que a Team paga estiver disponível.

## 11. Comandos úteis para retomada

Os comandos abaixo consolidam o roteiro técnico principal. Eles devem ser executados no Mac virtual, dentro da pasta do projeto.

```bash
cd ~/meu-organizador-2
printf 'VITE_API_BASE_URL=https://meu-organizador-api-q9fc.onrender.com\n' > .env.local
pnpm build
npx cap sync ios
npx cap open ios
```

Para validar a API pública a qualquer momento:

```bash
curl -s https://meu-organizador-api-q9fc.onrender.com/api/trpc/system.health
```

Se o projeto tiver sido recriado em outro Mac, usar a sequência completa:

```bash
cd ~
gh repo clone 7nr8hmvthj-sketch/meu-organizador-2
cd ~/meu-organizador-2
pnpm install
printf 'VITE_API_BASE_URL=https://meu-organizador-api-q9fc.onrender.com\n' > .env.local
pnpm build
npx cap sync ios
npx cap open ios
```

## 12. Conclusão

O trabalho técnico principal para permitir teste em iPhone físico já foi realizado: o backend está público em HTTPS, o banco real está conectado, o app iOS foi reconstruído apontando para a API de produção e o projeto está pronto para assinatura no Xcode. O único bloqueio atual é a ativação da conta Apple Developer.

Quando a conta for ativada, a retomada deve focar exclusivamente em **Signing & Capabilities**, criação do app no **App Store Connect**, geração do **Archive** e envio ao **TestFlight**. Após o primeiro teste bem-sucedido no iPhone, a etapa de segurança mais importante será resetar a senha do Supabase exposta anteriormente e atualizar a variável `DATABASE_URL` no Render.

## 13. Referências

[1]: https://developer.apple.com/xcode/ "Xcode - Apple Developer"  
[2]: https://capacitorjs.com/docs/ios "Capacitor iOS Documentation"  
[3]: https://capacitorjs.com/docs/basics/workflow "Capacitor Workflow"  
[4]: https://capacitorjs.com/docs/cli/commands/sync "Capacitor CLI - cap sync"  
[5]: https://developer.apple.com/app-store-connect/ "App Store Connect - Apple Developer"  
[6]: https://developer.apple.com/testflight/ "TestFlight - Apple Developer"  
[7]: https://render.com/docs/web-services "Render Web Services"  
[8]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase - Connecting to Postgres"
