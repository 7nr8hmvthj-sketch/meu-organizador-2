# Estado observado no App Store Connect — 2026-06-04

O login no App Store Connect foi realizado com sucesso. A página atual está em `https://appstoreconnect.apple.com/apps` e mostra a seção **Apps** acessível para a conta **Brendon Almeida Nunes**. A tela informa **No Apps / You haven’t added any apps yet**, com botão **Add Apps** disponível. Também aparece um aviso sobre necessidade de informar o status de comerciante para distribuição na União Europeia, relacionado ao Digital Services Act.

Próximo passo planejado: abrir o fluxo **Add Apps / New App** apenas para verificar os campos necessários. Antes de criar/enviar o cadastro definitivo do app, será solicitada confirmação do usuário.

## Registro de Bundle ID — observação adicional

Após clicar em **Certificates, Identifiers & Profiles** pelo modal de novo app, a área Apple Developer abriu em `https://developer.apple.com/account/resources/identifiers/bundleId/add/`, mostrando a conta **Brendon Almeida Nunes** e a Team **U5T8B7T393** no topo direito. A tela exibiu a mensagem **This request is forbidden for security reasons / Please select a team / Ok**. Isso indica que será necessário selecionar ou confirmar explicitamente a Team no portal Apple Developer antes de registrar o Bundle ID `com.meuorganizador.app`.

## Apple Developer — seleção do tipo de identificador

Após acessar a lista de identificadores, o portal carregou corretamente a Team **U5T8B7T393**. A tela **Register a new identifier** está aberta com a opção **App IDs** selecionada, que é a opção correta para registrar o Bundle Identifier do aplicativo iOS. O próximo passo é clicar em **Continue** e configurar o App ID como aplicativo, com descrição e Bundle ID explícito.

## Apple Developer — tipo de App ID

A opção **App IDs** foi selecionada e, na etapa seguinte, o tipo **App** foi mantido para o aplicativo iOS principal. Após clicar em **Continue**, o portal iniciou o carregamento da tela de configuração do Bundle ID.

## Apple Developer — confirmação do App ID

A tela **Confirm your App ID** foi exibida com os dados corretos: **Description** = `Meu Organizador 2026`, **Bundle ID** = `com.meuorganizador.app (explicit)` e **App ID Prefix / Team ID** = `U5T8B7T393`. Nenhuma capacidade adicional foi marcada manualmente; o cadastro seguirá apenas com a configuração padrão necessária para o app iOS.

## Bundle Identifier registrado

O Bundle Identifier foi registrado com sucesso no Apple Developer. A lista de **Identifiers** passou a mostrar a entrada **Meu Organizador 2026** com o identificador **com.meuorganizador.app**. Com isso, o app já pode ser criado no App Store Connect usando esse Bundle ID.

## Retorno ao App Store Connect

Após registrar o Bundle Identifier, retornamos para `https://appstoreconnect.apple.com/apps` para criar o cadastro do app. A navegação carregou a área **Apps** do App Store Connect, ainda aguardando a renderização completa dos controles de criação.

## Formulário de novo app aberto

O formulário **New App** do App Store Connect foi aberto. A plataforma **iOS** foi selecionada. O seletor de Bundle ID já mostra a opção **Meu Organizador 2026 — com.meuorganizador.app**, confirmando que o identificador registrado no Apple Developer está disponível para criação do app. Campos pendentes nesta etapa: nome, idioma primário, Bundle ID, SKU e tipo de acesso de usuários.

## Campos preenchidos no New App

No formulário **New App**, foram preenchidos os campos aprovados: **Name** = `Meu Organizador 2026`, **Primary Language** = `Portuguese (Brazil)` e **SKU** = `meu-organizador-2026`. Ainda falta selecionar formalmente o **Bundle ID** `Meu Organizador 2026 — com.meuorganizador.app`, marcar **Full Access** e criar o app.

## Revisão antes de criar o app

O formulário **New App** está preenchido com: plataforma **iOS**, nome **Meu Organizador 2026**, idioma primário **Portuguese (Brazil)**, Bundle ID **Meu Organizador 2026 — com.meuorganizador.app**, SKU **meu-organizador-2026** e acesso **Full Access**. O botão **Create** ficou ativo, indicando que os campos obrigatórios foram aceitos pelo App Store Connect.

## App criado no App Store Connect

O cadastro do app foi criado com sucesso. O App Store Connect redirecionou para a página do app **Meu Organizador 2026**, na área **Distribution**, versão iOS **1.0 Prepare for Submission**. A URL exibida contém o identificador Apple do app: `6776681245`. A navegação principal agora mostra as abas **Distribution**, **Analytics**, **TestFlight** e **Xcode Cloud**. A etapa de cadastro web do app está concluída; o próximo bloco é alinhar assinatura/Bundle ID no projeto iOS e gerar o build para envio ao TestFlight.


## Incidente relatado no site oficial — 2026-06-04

Durante a retomada do fluxo iOS/TestFlight, o usuário relatou que a agenda havia sumido do site oficial e que as credenciais estavam sendo recusadas como inválidas. A investigação inicial mostrou que a API oficial `https://meu-organizador-api-q9fc.onrender.com` respondeu ao healthcheck com `ok: true`.

O endpoint direto de autenticação `auth.simpleLogin` foi testado contra a API oficial com as credenciais padrão do admin (`USER` / senha padrão registrada no projeto) e retornou `HTTP/2 200`, além de emitir o cookie `simple_auth` com `username=USER`, `role=admin` e `userId=1`. Em seguida, o site oficial foi aberto no navegador em `https://meu-organizador-api-q9fc.onrender.com/`; o login via interface com `USER` entrou com sucesso e a página **Agenda Mensal** carregou eventos de junho de 2026, incluindo plantões e compromissos. Portanto, neste ambiente, o site oficial, a API, a autenticação admin e os dados da agenda aparecem funcionais.

A hipótese mais provável para o problema observado pelo usuário é local ao navegador/dispositivo ou uso de URL diferente/antiga, cache, credencial digitada com variação, sessão/cookie antigo, ou delay momentâneo do Render. Não há evidência nesta verificação de perda de dados ou apagamento da agenda em produção.


## Decisão operacional sobre endereço web e API — 2026-06-04

Foi confirmado que o endereço funcional atual do sistema é `https://meu-organizador-api-q9fc.onrender.com/`. O problema relatado pelo usuário ocorreu porque estava sendo usado um endereço antigo. Para reduzir risco no envio ao TestFlight, a URL congelada para o build iOS permanece `https://meu-organizador-api-q9fc.onrender.com`, conforme `.env.production`.

O domínio comprado `agendaintegrada.xyz` não está descartado. Ele deve ser tratado como domínio personalizado a configurar posteriormente, apontando corretamente para o serviço Render. A recomendação operacional é concluir primeiro o TestFlight com a URL Render já validada; depois, configurar DNS/domínio customizado, testar estabilidade e somente então avaliar a troca da URL usada pelo app.
