# Manual de retomada do app iOS AGENDA em um novo Mac

**Autor:** Manus AI  
**Data:** 02 de junho de 2026  
**Projeto:** AGENDA / Meu Organizador  
**Repositório:** `7nr8hmvthj-sketch/meu-organizador-2`  
**Branch principal:** `main`

## 1. Objetivo deste manual

Este manual serve para retomar o trabalho em outro Mac alugado ou em um novo ambiente macOS sem repetir os problemas já resolvidos. O app já foi emulado com sucesso no simulador iOS após duas correções principais: a URL da API passou a aceitar `VITE_API_BASE_URL`, e o backend passou a liberar CORS para a origem `capacitor://localhost`.

> **Resumo prático:** no novo Mac, o caminho seguro é instalar Xcode, instalar as ferramentas de linha de comando, instalar Node/pnpm, clonar o repositório, criar o `.env.local`, rodar o backend, gerar o build web, sincronizar o Capacitor iOS e abrir o projeto no Xcode.

| Item | Valor atual |
|---|---|
| Nome do app Capacitor | `Meu Organizador` |
| Bundle ID atual | `com.meuorganizador.app` |
| Arquivo de configuração Capacitor | `capacitor.config.ts` |
| `webDir` configurado | `dist` |
| Repositório usado no Mac anterior | `~/meu-organizador-2` |
| Comando do backend local | `pnpm dev` |
| URL local da API para simulador | `http://localhost:3000` |
| Variável exigida no build iOS local | `VITE_API_BASE_URL=http://localhost:3000` |

## 2. Correções já aplicadas no GitHub

Antes de começar em outro Mac, confirme que o repositório foi atualizado até pelo menos estes commits. Eles são importantes porque resolvem exatamente os erros encontrados no Web Inspector.

| Commit | Mensagem | Motivo |
|---|---|---|
| `821f1e8` | `fix: usar URL absoluta da API no Capacitor` | Impede que o app chame `capacitor://localhost/api/trpc` e permite usar `VITE_API_BASE_URL` |
| `cb9561f` | `fix: liberar CORS para Capacitor iOS` | Permite que o backend aceite requisições vindas de `Origin: capacitor://localhost` |

Se, no próximo Mac, o app voltar a mostrar erro de rede, primeiro rode `git pull` dentro da pasta do projeto e confirme que esses commits aparecem em `git log --oneline -5`.

## 3. Instalação básica do Mac

O Xcode é a ferramenta oficial da Apple para desenvolver, testar e distribuir apps para plataformas Apple.[1] O Capacitor iOS também depende do Xcode e do CocoaPods para configurar e gerenciar o projeto iOS.[2] Portanto, a instalação do Xcode é obrigatória para continuar o app no simulador e depois preparar TestFlight.

| Ferramenta | Para que serve | Como instalar |
|---|---|---|
| Xcode | Abrir, assinar, emular e arquivar o app iOS | App Store do macOS ou página oficial da Apple |
| Command Line Tools | Fornece `git`, compiladores e utilitários usados por pacotes nativos | `xcode-select --install` |
| Homebrew | Facilita instalar Node, GitHub CLI e outras dependências | Site oficial do Homebrew |
| Node.js | Executa Vite, backend TypeScript e scripts do projeto | `brew install node` |
| pnpm | Gerenciador de pacotes usado pelo projeto | `corepack enable` e `corepack prepare pnpm@latest --activate` |
| GitHub CLI, opcional | Facilita clonar repositório privado com `gh repo clone` | `brew install gh` |

Execute estes comandos no Terminal do novo Mac:

```bash
xcode-select --install
```

Depois instale o **Xcode** pela App Store. Abra o Xcode pelo menos uma vez, aceite os termos e aguarde a instalação de componentes adicionais. Em seguida, selecione o Xcode ativo:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

Instale o Homebrew se ele ainda não existir:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Depois instale Node e, se desejar, GitHub CLI:

```bash
brew install node gh
node -v
npm -v
```

Ative o pnpm via Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

## 4. Clonar ou atualizar o repositório

No Mac anterior, ocorreu o erro `fatal: not a git repository` porque o comando `git pull` foi executado dentro da pasta pessoal `~`, e não dentro da pasta do projeto. No novo Mac, sempre entre na pasta correta antes de rodar comandos Git.

Se o projeto ainda **não** existir no novo Mac, clone o repositório:

```bash
cd ~
gh auth login
gh repo clone 7nr8hmvthj-sketch/meu-organizador-2
cd ~/meu-organizador-2
```

Se preferir usar Git sem GitHub CLI, clone pela URL HTTPS do GitHub:

```bash
cd ~
git clone https://github.com/7nr8hmvthj-sketch/meu-organizador-2.git
cd ~/meu-organizador-2
```

Se o projeto **já** existir no Mac, entre nele e atualize:

```bash
cd ~/meu-organizador-2
git pull
git log --oneline -5
```

A saída deve mostrar `cb9561f` e `821f1e8` entre os commits recentes.

## 5. Instalar dependências do projeto

O projeto possui `pnpm-lock.yaml`, portanto use `pnpm` para instalar as dependências. Dentro da pasta do projeto, rode:

```bash
cd ~/meu-organizador-2
pnpm install
```

Se houver erro relacionado a dependências nativas do iOS, volte ao Xcode e confirme que ele foi aberto ao menos uma vez. Em muitos Macs recém-alugados, o Xcode está instalado, mas seus componentes internos ainda não foram aceitos ou concluídos.

## 6. Arquivos de ambiente necessários

Para rodar no simulador como fizemos, o frontend iOS precisa saber onde está o backend local. Crie o arquivo `.env.local` na raiz do projeto com a URL local da API:

```bash
cd ~/meu-organizador-2
printf 'VITE_API_BASE_URL=http://localhost:3000\n' > .env.local
cat .env.local
```

O conteúdo esperado é exatamente:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Além disso, o backend pode depender de variáveis sensíveis, como `DATABASE_URL`, `JWT_SECRET`, `OWNER_OPEN_ID`, `ADMIN_INVITE_CODE`, `TRAINER_INVITE_CODE`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `BUILT_IN_FORGE_API_KEY`, `BUILT_IN_FORGE_API_URL` e `PORT`. Essas variáveis **não devem ser commitadas no GitHub**. Se o novo Mac for totalmente limpo, copie o arquivo `.env` seguro do ambiente anterior ou recrie as variáveis conforme o backend de desenvolvimento usado no projeto.

| Arquivo | Deve ir para o Git? | Função |
|---|---:|---|
| `.env.local` | Não | Define `VITE_API_BASE_URL` para o build local do app iOS |
| `.env` | Não | Guarda credenciais e configurações sensíveis do backend |
| `package.json` | Sim | Define scripts como `pnpm dev` e `pnpm build` |
| `capacitor.config.ts` | Sim | Define `appId`, `appName` e `webDir` do Capacitor |

## 7. Rodar o backend local

Abra um Terminal dedicado apenas para o backend. Ele deve continuar rodando enquanto o app estiver aberto no simulador:

```bash
cd ~/meu-organizador-2
pnpm dev
```

Não feche esse Terminal. Se precisar aplicar mudanças no backend, pare com `Ctrl+C` e rode `pnpm dev` novamente.

Para confirmar que o backend está ouvindo na porta 3000, use outro Terminal:

```bash
lsof -iTCP:3000 -sTCP:LISTEN
```

Também é possível testar a rota tRPC diretamente:

```bash
curl -i "http://localhost:3000/api/trpc/auth.checkSimpleAuth?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D"
```

E testar a origem do Capacitor:

```bash
curl -i \
  -H "Origin: capacitor://localhost" \
  "http://localhost:3000/api/trpc/auth.checkSimpleAuth?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D"
```

Depois do commit `cb9561f`, a resposta deve permitir CORS para `capacitor://localhost`.

## 8. Build web e sincronização com Capacitor iOS

O fluxo do Capacitor é diferente de um app web comum. Primeiro é necessário gerar o build web; depois o Capacitor sincroniza esse bundle com o projeto nativo iOS.[3] A documentação oficial informa que `npx cap sync` copia o bundle já construído e atualiza dependências nativas.[4]

No nosso projeto, rode em um Terminal separado do backend:

```bash
cd ~/meu-organizador-2
pnpm build
cp -R dist/public/. dist/
npx cap sync ios
```

O comando `cp -R dist/public/. dist/` foi usado porque o build web do projeto gera os arquivos públicos em `dist/public`, enquanto o `capacitor.config.ts` está com `webDir: 'dist'`. Sem essa cópia, o app iOS pode abrir sem os arquivos esperados.

| Comando | O que faz |
|---|---|
| `pnpm build` | Gera o frontend e o bundle do servidor em `dist` |
| `cp -R dist/public/. dist/` | Coloca os arquivos web no local esperado pelo Capacitor |
| `npx cap sync ios` | Copia os arquivos web para o projeto iOS e atualiza dependências nativas |
| `npx cap open ios` | Abre o projeto iOS no Xcode |

## 9. Abrir no Xcode e rodar no simulador

A documentação do Capacitor permite abrir o projeto iOS com `npx cap open ios` ou manualmente com `open ios/App/App.xcworkspace`.[2] Use preferencialmente:

```bash
cd ~/meu-organizador-2
npx cap open ios
```

Se preferir abrir manualmente:

```bash
open ios/App/App.xcworkspace
```

No Xcode, selecione um simulador de iPhone, como iPhone 16 ou equivalente, e clique em **Run**. O backend precisa continuar rodando com `pnpm dev` em outro Terminal.

## 10. Verificação no Web Inspector

Quando o app abrir no simulador, use o Web Inspector do Safari para verificar as chamadas de rede. O erro que já resolvemos aparecia assim:

```text
URL: capacitor://localhost/api/trpc/auth.checkSimpleAuth...
```

Depois da correção, a URL correta deve ser:

```text
http://localhost:3000/api/trpc/auth.checkSimpleAuth...
```

Na requisição, a origem do app iOS será:

```text
Origin: capacitor://localhost
```

Isso é esperado. O backend já foi ajustado para liberar essa origem.

## 11. Troubleshooting dos problemas já encontrados

Esta seção deve ser usada primeiro caso os mesmos erros reapareçam no próximo Mac.

| Sintoma | Causa provável | Correção |
|---|---|---|
| `fatal: not a git repository` | Você está fora da pasta do projeto | Rode `cd ~/meu-organizador-2` antes de `git pull` |
| App fica carregando e a URL é `capacitor://localhost/api/trpc` | `.env.local` ausente ou build feito antes da variável | Crie `.env.local`, rode `pnpm build`, `cp -R dist/public/. dist/` e `npx cap sync ios` |
| App chama `http://localhost:3000`, mas aparece `Status: —` | Backend parado ou CORS/HTTP bloqueado | Confirme `pnpm dev`, teste `curl -i` e verifique CORS |
| Web Inspector mostra `Origin: capacitor://localhost` | Comportamento normal do Capacitor | O backend deve responder com CORS liberado para essa origem |
| Mudança no backend não aparece | Servidor antigo ainda rodando | Pare com `Ctrl+C` e rode `pnpm dev` novamente |
| Mudança no frontend não aparece no simulador | Build antigo sincronizado | Rode novamente `pnpm build`, `cp -R dist/public/. dist/`, `npx cap sync ios` e reabra o app |
| Xcode não abre o workspace | Dependências iOS não sincronizadas | Rode `npx cap sync ios` e depois `npx cap open ios` |
| App funciona no simulador, mas não em iPhone físico | `localhost` aponta para o próprio iPhone | Use o IP local do Mac ou uma API pública HTTPS |

## 12. Checklist rápido para retomar em outro Mac

Use este checklist quando abrir um novo Mac alugado.

| Ordem | Ação | Comando ou local |
|---:|---|---|
| 1 | Instalar Xcode | App Store / Apple Developer |
| 2 | Abrir Xcode e aceitar componentes | Aplicativo Xcode |
| 3 | Instalar ferramentas de linha de comando | `xcode-select --install` |
| 4 | Instalar Homebrew, Node e pnpm | `brew install node gh` e `corepack enable` |
| 5 | Clonar o repositório | `gh repo clone 7nr8hmvthj-sketch/meu-organizador-2` |
| 6 | Entrar na pasta | `cd ~/meu-organizador-2` |
| 7 | Instalar dependências | `pnpm install` |
| 8 | Criar `.env.local` | `VITE_API_BASE_URL=http://localhost:3000` |
| 9 | Rodar backend | `pnpm dev` |
| 10 | Gerar build e sincronizar iOS | `pnpm build && cp -R dist/public/. dist/ && npx cap sync ios` |
| 11 | Abrir no Xcode | `npx cap open ios` |
| 12 | Rodar no simulador | Botão **Run** no Xcode |
| 13 | Conferir Web Inspector | URL deve ser `http://localhost:3000/api/trpc/...` |

## 13. Próximos passos para virar app baixável

O simulador local está resolvido, mas um app baixável não pode depender de `http://localhost:3000`. Para TestFlight e App Store, será necessário hospedar o backend em uma URL pública com HTTPS e fazer o build do app apontando para essa API de produção. O App Store Connect é a ferramenta da Apple para enviar, gerenciar e publicar apps, além de convidar usuários para testes via TestFlight.[5] O TestFlight permite distribuir builds beta, coletar feedback e testar antes da publicação pública.[6]

| Etapa | Decisão necessária | Observação |
|---|---|---|
| Backend público | Escolher hospedagem e domínio HTTPS | Exemplo: `https://api.seu-dominio.com` |
| Variável de produção | Trocar `VITE_API_BASE_URL` no build de release | Exemplo: `VITE_API_BASE_URL=https://api.seu-dominio.com` |
| CORS de produção | Manter `capacitor://localhost` e liberar origens necessárias | O app Capacitor pode continuar usando essa origem interna |
| Conta Apple Developer | Inscrever-se no Apple Developer Program | Necessário para distribuição via TestFlight/App Store; a Apple informa membership anual para distribuição.[7] |
| Assinatura no Xcode | Configurar Team, Bundle ID, versão e certificados | Necessário para Archive e upload |
| TestFlight | Subir primeiro beta | Melhor caminho antes de publicar na App Store |
| App Store | Preparar descrição, política de privacidade e screenshots | Necessário para revisão pública |

Para um **iPhone físico em teste local**, se o backend continuar rodando no Mac, `localhost` não funcionará porque no iPhone `localhost` é o próprio aparelho. Nesse cenário, use o IP local do Mac:

```env
VITE_API_BASE_URL=http://192.168.x.x:3000
```

Depois repita:

```bash
pnpm build
cp -R dist/public/. dist/
npx cap sync ios
```

Para distribuição real, prefira sempre HTTPS público, não IP local.

## 14. Comandos finais em sequência

Quando o novo Mac já estiver com Xcode, Node e pnpm instalados, a sequência completa mais provável será:

```bash
cd ~
gh repo clone 7nr8hmvthj-sketch/meu-organizador-2
cd ~/meu-organizador-2
pnpm install
printf 'VITE_API_BASE_URL=http://localhost:3000\n' > .env.local
```

Terminal 1, backend:

```bash
cd ~/meu-organizador-2
pnpm dev
```

Terminal 2, build iOS:

```bash
cd ~/meu-organizador-2
pnpm build
cp -R dist/public/. dist/
npx cap sync ios
npx cap open ios
```

No Xcode, selecione o simulador e rode o app.

## 15. Referências

[1]: https://developer.apple.com/xcode/ "Xcode - Apple Developer"  
[2]: https://capacitorjs.com/docs/ios "Capacitor iOS Documentation"  
[3]: https://capacitorjs.com/docs/basics/workflow "Capacitor Workflow"  
[4]: https://capacitorjs.com/docs/cli/commands/sync "Capacitor CLI - cap sync"  
[5]: https://developer.apple.com/app-store-connect/ "App Store Connect - Apple Developer"  
[6]: https://developer.apple.com/testflight/ "TestFlight - Apple Developer"  
[7]: https://developer.apple.com/programs/ "Apple Developer Program"
