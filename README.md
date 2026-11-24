# NEXA v0.8.3 — pacote de demonstração com localização dos acionamentos

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


## Inteligência territorial v0.8

A interface de gestão incorpora mapa interativo com seleção entre bairros e RPAs, além de camada de células geográficas agregadas (~1 km). Os limites são obtidos pelo servidor a partir do Portal de Dados Abertos da Prefeitura do Recife (GeoJSON 2023; licença ODbL) e mantidos em cache em memória por 24 horas. A visualização coroplética soma células agregadas dentro dos polígonos e suprime unidades abaixo do mínimo configurado (padrão 5). A camada de células mostra apenas centroides aproximados das células, nunca coordenadas individuais.

A biblioteca Leaflet é instalada como dependência do projeto e servida localmente pelo próprio servidor. O mapa-base oferece CARTO claro como padrão e OpenStreetMap como alternativa selecionável; ambos exigem conexão com a internet. A API territorial exige autenticação e os perfis autorizados já definidos no sistema.

**Limitação importante:** a visualização só exibirá concentrações quando existirem dados agregados suficientes. No protótipo recém-publicado, a ausência de dados é normal. Não inserir ocorrências reais ou dados identificáveis.


## Correção v0.8.1 — localização dos acionamentos

O aplicativo solicita a geolocalização com alta precisão e sem reutilizar posição em cache (`maximumAge: 0`). Quando obtida, latitude, longitude e precisão estimada são enviadas junto ao protocolo. A tela de resultado informa as coordenadas registradas.

O painel NEXA Gestão possui uma camada específica para os pontos individuais, com protocolo, horário, situação e precisão estimada no marcador. A camada pode ser ligada ou desligada independentemente das células agregadas. A consulta dos pontos individuais exige autenticação e perfil operacional (administrador, coordenação ou profissional); o perfil de consulta não recebe coordenadas individuais.

A localização depende de permissão do navegador, GPS/sensores disponíveis, HTTPS e condições do aparelho. Se a pessoa negar a permissão ou o aparelho não conseguir obter a posição, o pedido poderá ser registrado sem coordenadas. A precisão exibida é a informada pelo dispositivo, não uma garantia de localização do endereço ou do imóvel.

**Atenção:** coordenadas exatas são dados de alta sensibilidade. Esta versão continua sendo exclusivamente demonstrativa. Não utilizar dados reais, não publicar o painel e não considerar a integração com órgãos públicos como operacional.


## Correções v0.8.2

- Leaflet servido localmente, sem dependência do CDN unpkg.
- O mapa-base do Recife e os marcadores de acionamento continuam disponíveis mesmo se a fonte de limites oficiais estiver temporariamente indisponível.
- Mensagens de erro da API são apresentadas na interface para facilitar o diagnóstico.
- O painel de detalhamento recebe foco/rolagem ao abrir uma solicitação.
- Recursos HTML, JavaScript e CSS do painel não são mantidos em cache pelo navegador.

**Persistência:** o plano gratuito do Render mantém armazenamento efêmero. Registros, usuários e sessões podem ser perdidos em reinicializações ou novos deploys. Para operação institucional, é necessária uma base de dados persistente e infraestrutura apropriada.


## Cartografia v0.8.3

O mapa-base utiliza CARTO Positron (com atribuição OpenStreetMap/CARTO) e oferece OpenStreetMap como camada alternativa. Os marcadores operacionais são vermelhos para solicitações recebidas/em avaliação e laranja para atendimento/encaminhamento/acompanhamento. Os limites administrativos continuam sendo carregados da fonte oficial da Prefeitura via GeoJSON; a indisponibilidade temporária dessa fonte não impede a visualização do mapa-base e dos pontos autorizados.
