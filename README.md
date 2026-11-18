# NEXA — pacote de demonstração para publicação gratuita

Este projeto é um protótipo demonstrativo. Não utilizar com dados reais nem como serviço de emergência.

## Publicação gratuita no Render

O projeto inclui `render.yaml`, com configuração para criar um Web Service gratuito no Render.

### Etapa 1 — preparar o código no GitHub
1. Crie uma conta em https://github.com, caso ainda não tenha.
2. Crie um repositório novo chamado `nexa-demonstracao`.
3. Extraia este ZIP no computador.
4. Envie o conteúdo da pasta do projeto para o repositório. O arquivo `render.yaml` e `server.js` devem ficar na raiz do repositório (não dentro de uma pasta adicional).

### Etapa 2 — criar o serviço no Render
1. Crie uma conta em https://render.com.
2. No painel, escolha **New > Blueprint**.
3. Conecte o GitHub e selecione o repositório `nexa-demonstracao`.
4. O Render identificará o `render.yaml`. Confirme a criação do serviço gratuito.
5. Aguarde o deploy terminar. O Render fornecerá um endereço HTTPS `*.onrender.com`.

### Etapa 3 — primeiro acesso
- NEXA Proteção: endereço HTTPS fornecido pelo Render.
- NEXA Gestão: o mesmo endereço seguido de `/console`.
- Usuário inicial: `admin`.
- A senha inicial é gerada e definida na variável `NEXA_ADMIN_PASSWORD` do serviço no Render. Consulte **Environment** no painel do serviço para visualizar o valor gerado. Não compartilhe essa senha.

### Etapa 4 — instalar no celular
- Android: abra o endereço HTTPS no Chrome e escolha **Instalar aplicativo** ou **Adicionar à tela inicial**.
- iPhone: abra no Safari, toque em **Compartilhar** e depois **Adicionar à Tela de Início**.
- Se o navegador oferecer o botão de instalação na própria tela, ele também poderá ser utilizado.

## Limitações do plano gratuito
O serviço gratuito do Render pode suspender após 15 minutos sem tráfego e demora um pouco para reativar. O sistema de arquivos é efêmero: os registros JSON e as contas criadas podem desaparecer quando o serviço reiniciar, suspender ou receber novo deploy. As sessões também são mantidas em memória. Portanto, utilize exclusivamente dados fictícios e considere o ambiente temporário. Consulte a documentação oficial: https://render.com/docs/free.

## Escopo de segurança
- Integrações com PM/CIODS e Guarda Municipal são simuladas.
- Nenhum pedido chega a órgão público ou central de emergência.
- Não cadastrar mulheres reais, endereços residenciais, telefones pessoais ou relatos identificáveis.
- Não utilizar para atendimento, triagem ou tomada de decisão sobre casos reais.
- A publicação gratuita é apenas uma demonstração técnica, não uma implantação institucional.

## Execução local
Requer Node.js 18 ou superior:

```bash
NEXA_ADMIN_PASSWORD='senha-de-demonstracao' node server.js
```

Acesse `http://localhost:3000` e `http://localhost:3000/console`.
