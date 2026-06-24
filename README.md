# @areumtecnologia/baileys

[![npm version](https://img.shields.io/npm/v/@areumtecnologia/baileys.svg)](https://www.npmjs.com/package/@areumtecnologia/baileys)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Uma biblioteca de alto nível (wrapper) robusta e resiliente para a [Baileys](https://github.com/WhiskeySockets/Baileys). Facilita a criação e o gerenciamento de conexões com o WhatsApp, oferecendo uma arquitetura baseada em eventos unificados, normalização de mensagens para estruturas ricas e handlers especializados para simplificar a lógica de negócio do seu bot.

---

## ✨ Características

- 🚀 **Simplificação do Ciclo de Vida**: Conexão auto-gerenciável, tratamento automático de desconexões e reconexão inteligente.
- 📩 **Estrutura de Mensagens Ricas**: Mensagens recebidas são completamente normalizadas em objetos JavaScript amigáveis, contendo helpers para baixar mídias, verificar menções, respostas, reações e votos.
- 🛠️ **Handlers Especializados**: Módulos desacoplados para gerenciar Mensagens, Grupos, Contatos, Usuários, Newsletters, Chamadas e Status.
- 🔘 **Mensagens Interativas de Última Geração**: Suporte nativo para construir e enviar botões interativos (`Quick Reply`, `URL`, `Copy Code`, `Call`, `Location`) e menus de lista de seleção única (`List Buttons`).
- 📂 **Multi-Sessão Nativa**: Persistência de estado de autenticação simplificada e isolamento seguro por sessão.

---

## 📦 Instalação

Instale o pacote através do npm:

```bash
npm install @areumtecnologia/baileys
```

---

## 🚀 Início Rápido

Aqui está um exemplo básico de como inicializar o cliente, escutar eventos e interagir com mensagens:

```javascript
const { Client, ClientEvent } = require('@areumtecnologia/baileys');

// Inicializa o cliente com configurações personalizadas
const client = new Client({
    sessionName: 'sessao-suporte',
    printQRInTerminal: true,
    restartOnClose: true
});

// Evento disparado quando a conexão com o WhatsApp está pronta
client.on(ClientEvent.CONNECTED, (user) => {
    console.log(`✅ Conectado com sucesso como: ${user.name} (${user.id})`);
});

// Escuta novas mensagens recebidas
client.on(ClientEvent.MESSAGE_RECEIVED, async (message) => {
    console.log(`📩 Nova mensagem de ${message.fromPushName} (${message.from}): ${message.body}`);

    // Exemplo de resposta simples
    if (message.body === '!ping') {
        await client.messages.sendTextMessage(message.from, 'pong! 🏓');
    }

    // Se a mensagem contiver mídia (imagem, áudio, etc)
    if (message.hasMedia && message.media) {
        console.log(`Mídia recebida do tipo: ${message.media.mimetype}`);
        
        // Baixa a mídia usando o helper integrado
        const attachments = await message.media.getAttachments();
        const base64Data = attachments.toBase64();
        console.log(`Tamanho do buffer de mídia: ${attachments.buffer.length} bytes`);
    }
});

// Trata erros ou desconexões inesperadas
client.on(ClientEvent.ERROR, (error) => {
    console.error('❌ Ocorreu um erro no cliente:', error);
});

// Inicia o processo de conexão
client.connect();
```

---

## ⚙️ Opções de Configuração

Ao instanciar a classe `Client`, você pode customizar o comportamento da conexão passando as seguintes opções no construtor:

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `sessionName` | `string` | `'session'` | Identificador único da sessão para isolar dados de autenticação. |
| `dataPath` | `string` | `'.baileys/sessions'` | Caminho base onde as credenciais das sessões serão persistidas. |
| `printQRInTerminal` | `boolean` | `false` | Se `true`, imprime o QR code para autenticação diretamente no console. |
| `loggerLevel` | `string` | `'error'` | Nível do log interno (ex: `'debug'`, `'info'`, `'warn'`, `'error'`). |
| `restartOnClose` | `boolean` | `false` | Tenta restabelecer a conexão automaticamente caso ocorra uma queda de rede/serviço. |
| `markOnlineOnConnect`| `boolean` | `false` | Mantém o status do bot como "Online" logo após conectar. |
| `environment` | `Array` | `['Mac OS', 'Chrome', '144.0.7559.110']` | Array customizado para simular a plataforma do navegador da sessão. |
| `waVersion` | `Array` | `null` | Sobrescreve a versão padrão do WhatsApp Web (Array de 3 números). |
| `store` | `object` | `MessageStore` | Instância customizada para leitura e gravação em cache/banco de mensagens. |

---

## 🔔 Eventos (`ClientEvent`)

A classe `Client` herda do `EventEmitter` do Node.js e emite eventos semânticos correspondentes ao ciclo de vida da aplicação:

### Ciclo de Conexão e Autenticação
-   `init`: Iniciando o processo de carregamento de credenciais.
-   `connecting`: Tentando estabelecer conexão de socket com os servidores do WhatsApp.
-   `status_change`: Disparado quando ocorre mudança no status geral do cliente.
-   `pairing_code`: QR Code gerado. Retorna um objeto contendo `{ base64, qr, attempts }`.
-   `pairing_success`: QR Code escaneado com sucesso e login concluído.
-   `connected`: Conexão estabelecida e autenticação pronta. Retorna o perfil do bot normalizado.
-   `disconnected`: Desconectado dos servidores. Retorna `{ statusCode, statusType, reason, details }`.

### Mensagens
-   `message_received`: Nova mensagem recebida do usuário (Normalizada).
-   `message_sent`: Mensagem enviada pelo próprio bot (Normalizada).
-   `message_update`: Mensagem editada ou atualizada no chat (Ex: recebimento de confirmações).
-   `message_delete`: Mensagem excluída da conversa.
-   `message_reaction`: Reação com emoji recebida/enviada.
-   `messages_history_sync_done`: Sincronização de histórico concluída com sucesso.
-   `broadcast_message`: Mensagem recebida via lista de transmissão ou Status.
-   `notification`: Notificação interna de sistema ou protocolo.

### Outros Recursos
-   `call`: Nova chamada de voz/vídeo recebida pelo número.
-   `presence_update`: Mudança no status de presença de contatos (digitando, gravando, online).
-   `contacts_upsert` / `contacts_update`: Atualizações na lista ou metadados de contatos.
-   `groups_upsert` / `groups_update`: Criação ou alteração de informações nos grupos participantes.
-   `group_participants_update`: Mudanças nos membros de um grupo (entrada, saída, promoções).
-   `blocklist_update`: Atualização na lista de contatos bloqueados.
-   `chat_update` / `chat_delete`: Modificações em chats locais da conta.

---

## 📩 Estrutura de Mensagem Normalizada

Todas as mensagens emitidas nos eventos `message_received` e `message_sent` são processadas através do `MessageNormalizer`, gerando um objeto padronizado com a seguinte estrutura:

```javascript
{
    id: "3EB0...",             // Identificador único da mensagem
    chat: {                    // Objeto de contato normalizado associado ao chat
        id: "559199999999@s.whatsapp.net",
        name: "João Silva",
        type: "personal"       // 'personal' | 'business' | 'group' | 'newsletter'
    },
    fromMe: false,             // Define se a mensagem partiu do bot
    from: "559199999999@...",  // Quem enviou a mensagem
    fromPushName: "João",      // Nome de exibição configurado no perfil do emissor
    to: "559188888888@...",    // Destinatário da mensagem
    type: "text",              // Tipo amigável ('text', 'image', 'audio', 'document', 'sticker', 'location', 'contact', 'interactive_reply', etc)
    body: "Olá, mundo!",       // Corpo de texto principal extraído da mensagem
    hasMedia: false,           // Flag indicando a presença de mídia para download
    media: null,               // Objeto com metadados de mídia (caso hasMedia seja true)
    location: null,            // Objeto contendo { latitude, longitude } para mensagens de localização
    contacts: [],              // Lista de contatos formatados se recebido um vCard
    isReply: false,            // Indica se é uma resposta citada (quoted)
    quotedMessage: null,       // Mensagem citada recursivamente normalizada
    isForwarded: false,        // Indica se a mensagem foi encaminhada
    mentions: [],              // Lista de JIDs mencionados na mensagem
    isMentioningMe: false,     // Indica se o JID do próprio bot foi mencionado
    isEdited: false,           // Se a mensagem foi editada posteriormente
    interactiveReply: null,    // ID e texto do botão clicado caso seja uma resposta interativa
    reaction: null,            // Estrutura de emoji e timestamp caso seja reação
    poll: null,                // Dados de criação de enquete
    pollUpdate: null,          // Votos decodificados recebidos em enquetes
    timestamp: Date,           // Objeto Date representando quando a mensagem foi criada
    raw: { ... }               // Objeto bruto original fornecido pela Baileys (útil para uso avançado)
}
```

### Download de Mídias
Quando `hasMedia` é `true`, você pode acessar `message.media.getAttachments()` para obter um conjunto de helpers utilitários para manipulação do buffer:

```javascript
const attachments = await message.media.getAttachments();

attachments.mimetype;           // Mimetype do arquivo (ex: 'image/png')
attachments.extension;          // Extensão sugerida (ex: 'png')
attachments.buffer;             // Buffer binário completo do arquivo

// Métodos utilitários:
attachments.toBase64();         // Converte para String Base64
attachments.toDataUri();        // Retorna formato Data URI
attachments.toArrayBuffer();    // Retorna ArrayBuffer
await attachments.save(caminho);// Grava a mídia em um caminho local e retorna o nome e arquivo.
```

---

## 📚 Referência de API dos Handlers

A biblioteca separa responsabilidades organizando seus recursos em handlers acessíveis diretamente pela instância do `client`.

### 📩 Mensagens (`client.messages`)

Responsável por todas as operações de envio, respostas, download e modificações de mensagens nos chats.

-   `sendMessage(jid, content, options)`: Envia um payload bruto customizado da Baileys para o JID especificado.
    -   *Opções especiais*: `{ composing: { timeout: MS } }` ou `{ recording: { timeout: MS } }` simula o estado "digitando" ou "gravando áudio" por `MS` milissegundos antes de enviar a mensagem.
-   `sendTextMessage(jid, text, options)`: Envia uma mensagem de texto simples.
-   `reply(originalMessage, content)`: Responde (marcando e citando) a uma mensagem recebida.
-   `sendImage(jid, media, caption, options)`: Envia uma imagem (parâmetro `media` aceita URL pública ou Buffer).
    -   *Opção*: `{ viewOnce: true }` para envio temporário.
-   `sendVideo(jid, media, caption, options)`: Envia um vídeo (parâmetro `media` aceita URL ou Buffer).
    -   *Opção*: `{ viewOnce: true }` para visualização única.
-   `sendAudio(jid, media, ptt, options)`: Envia um áudio. Defina `ptt: true` para simular gravação de mensagem de voz no WhatsApp.
-   `sendDocument(jid, media, mimetype, fileName, caption, options)`: Envia um arquivo/documento genérico.
-   `sendLocation(jid, latitude, longitude, name, address)`: Envia uma mensagem contendo pin de mapa.
-   `sendContacts(jid, contacts)`: Envia cartões de contatos estruturados (vCards). O parâmetro `contacts` é um array de objetos `{ fullName, waid, organization }`.
-   `sendPoll(jid, pollName, pollValues, options)`: Cria uma enquete com opções de voto.
-   `sendLink(jid, url, options)`: Envia um link ativando a renderização prévia de metadados da URL (preview).
-   `forwardMessage(jid, messageToForward)`: Encaminha uma mensagem existente para outro chat.
-   `editMessage(originalMessageKey, newText)`: Edita o texto de uma mensagem anteriormente enviada pelo bot.
-   `react(messageKey, emoji)`: Adiciona uma reação com emoji a uma mensagem.
-   `delete(messageKey)`: Apaga uma mensagem enviada pelo bot para todos os participantes do chat.
-   `read(messageKey)`: Envia a confirmação de leitura da mensagem.
-   `composing(jid, ts)`: Aciona o estado "digitando..." para o destinatário JID.
-   `getMessages(jid, limit)`: Busca o histórico local ou remoto de mensagens de um chat (limite padrão de 50 mensagens).
-   `getAttachments(message)`: Efetua o download e retorna helpers para a mídia contida em um payload de mensagem bruto.

### 👥 Grupos (`client.groups`)

Contém as operações de criação, modificação de metadados e moderação de membros em grupos.

-   `getMetadata(groupId)`: Retorna as configurações e lista de participantes ativos em um grupo. Utiliza cache integrado de 5 minutos.
-   `getAllGroups()`: Retorna uma lista com todos os grupos que o bot faz parte.
-   `getProfilePicture(jid)`: Obtém o link público para a foto de perfil do grupo.
-   `create(subject, participantsJids)`: Cria um novo grupo.
-   `leave(groupId)`: Sai de um grupo.
-   `updateName(groupId, newName)`: Altera o título de exibição de um grupo.
-   `updateDescription(groupId, newDescription)`: Atualiza a descrição textual do grupo.
-   `updateParticipants(groupId, participantsJids, action)`: Gerencia membros. Valores aceitos para a ação: `'add' | 'remove' | 'promote' | 'demote'`.
-   `addParticipants(groupId, participantsJids)`: Atalho direto para adicionar novos membros.
-   `removeParticipants(groupId, participantsJids)`: Atalho direto para remover membros.
-   `promoteParticipants(groupId, participantsJids)`: Concede privilégios de administrador do grupo a membros específicos.
-   `demoteParticipants(groupId, participantsJids)`: Retira os privilégios de administrador de membros específicos.
-   `getInviteCode(groupId)`: Retorna o sufixo alfanumérico do link de convite do grupo.
-   `revokeInviteCode(groupId)`: Invalida o código/link de convite antigo e gera um novo.

### 👤 Usuários e Contatos (`client.users` e `client.contacts`)

Handlers focados no gerenciamento de contatos, privacidade e metadados de contas pessoais ou comerciais.

#### `client.users`
-   `getMetadata(jid)`: Retorna dados estruturados de um contato (nome, foto, tipo).
-   `getStatus(id)`: Retorna a frase de "Recado" cadastrada no perfil do contato.
-   `getPnForLid(lid)`: Retorna o JID convencional (baseado em número de telefone) associado a um identificador interno LID do WhatsApp.
-   `getMyStatus()`: Retorna o status de "Recado" da conta do bot.
-   `getBusinessProfile(jid)`: Retorna dados comerciais adicionais se for uma conta comercial (descrição, endereço, e-mail, etc).
-   `getProfilePicture(jid)`: Obtém a imagem de exibição do usuário.
-   `isOnWhatsApp(number)`: Verifica se um número de telefone está cadastrado no WhatsApp (normalizando DDI e o nono dígito).
-   `updateProfileName(newName)`: Atualiza o nome de perfil público da conta do bot.
-   `updateProfileStatus(newStatus)`: Atualiza a frase de recado da conta do bot.
-   `block(jid)` / `unblock(jid)`: Bloqueia ou desbloqueia um contato.
-   `getBlocklist()`: Retorna todos os contatos bloqueados pela conta do bot.
-   `sendPresence(jid, presenceStatus)`: Atualiza a presença visível do bot em relação a um chat (valores do `PresenceStatus`: `'available'`, `'unavailable'`, `'composing'`, `'recording'`).

#### `client.contacts`
-   `get(jid)`: Recupera um contato diretamente do cache local em memória.
-   `getAll()`: Retorna todos os contatos presentes no cache em memória.
-   `set(jid, contact)`: Adiciona ou atualiza manualmente um contato na estrutura de cache do cliente.
-   `normalize(message)`: Efetua varredura na mensagem para extrair, carregar metadados externos (como imagem de perfil e status) e formatar um contato estruturado.

### 📰 Newsletters / Canais (`client.newsletters`)

Permite a interação básica de leitura e criação de Canais do WhatsApp.

-   `getMetadata(id)`: Retorna metadados de um Canal através do ID ou link de convite.
-   `getAllNewsletters()`: Retorna a lista de canais nos quais o bot está inscrito.
-   `follow(id)` / `unfollow(id)`: Inscreve-se ou cancela a inscrição em um canal.
-   `mute(jid, duration)` / `unmute(jid)`: Configura silenciamento de notificações do canal.
-   `create(name, description, picture)`: Cria um novo canal próprio do bot.
-   `delete(jid)`: Exclui permanentemente um canal criado pelo bot.
-   `updateName(jid, name)`: Atualiza o nome do canal.
-   `updateDescription(jid, description)`: Altera a descrição do canal.
-   `updatePicture(jid, picture)`: Atualiza o avatar do canal.
-   `update(jid, { name, description, picture })`: Método utilitário para atualizar múltiplos dados ao mesmo tempo.
-   `updateReactionMode(jid, mode)`: Configura a regra de reações em posts do canal. Valores: `'ALL' | 'BASIC' | 'NONE'`.

### 📞 Chamadas (`client.calls`)

-   `reject(call)`: Recusa uma chamada telefônica de voz/vídeo recebida pelo bot.

### 📱 Status (`client.status`)

Responsável por enviar, gerenciar e excluir publicações de Status (Stories) no WhatsApp.

-   `send(jids, content, options)`: Envia uma publicação de status para uma lista de contatos.
    -   `jids`: Array de JIDs que receberão ou serão mencionados no status.
    -   `content`: Conteúdo da mensagem a ser enviada (texto, imagem, vídeo, etc.).
    -   *Opções*:
        -   `sendMentions` (boolean): Se `true`, realiza a menção no status (limita o array de JIDs a no máximo 5 elementos devido a restrições do WhatsApp).
        -   `backgroundColor` (string): Cor de fundo para o status de texto (padrão: `'#288d7c85'`).
        -   `font` (number): Estilo de fonte para o status de texto (padrão: `1`).
-   `delete(msg)`: Exclui uma publicação de status enviada anteriormente.

---

## 🔘 Mensagens Interativas

A biblioteca disponibiliza classes auxiliares estruturadas para a criação de mensagens interativas avançadas com facilidade.

### 1. Botões de Resposta Rápida (Quick Reply)
Gera botões de clique rápido que enviam o texto correspondente de volta ao chat ao serem tocados.

```javascript
const { InteractiveMessage, QuickReplyButton } = require('@areumtecnologia/baileys');

const message = new InteractiveMessage()
    .withText('Olá! Escolha uma das opções abaixo:')
    .withFooter('Responda clicando em um dos botões')
    .addButton(new QuickReplyButton('id_opcao_1', 'Falar com Atendente'))
    .addButton(new QuickReplyButton('id_opcao_2', 'Ver Menu Principal'));

await client.messages.sendMessage(jid, message.build());
```

### 2. Links de Chamada à Ação (CTA URL / Call / Copy Code / Location)
Exibe botões especiais para direcionamento para sites externos, chamadas de voz normais da operadora, cópia de códigos PIX/Cupons e compartilhamento de localização:

```javascript
const { InteractiveMessage, UrlButton, CopyCodeButton, CallButton, LocationButton } = require('@areumtecnologia/baileys');

const message = new InteractiveMessage()
    .withText('Aqui estão seus links especiais:')
    .addButton(new UrlButton('Acessar Site', 'https://unitychat.areum.com.br'))
    .addButton(new CopyCodeButton('Copiar Código PIX', 'pix-payload-key-12345'))
    .addButton(new CallButton('Ligar para o Suporte', '559199999999'))
    .addButton(new LocationButton('Compartilhar Localização'));

await client.messages.sendMessage(jid, message.build());
```

### 3. Listas Interativas (Menus de Seleção Única)
Permite enviar uma lista completa dividida por seções para seleções únicas:

```javascript
const { InteractiveMessage, ListButton, ListSection, ListRow } = require('@areumtecnologia/baileys');

const listMenu = new InteractiveMessage()
    .withText('Selecione o produto de interesse:')
    .withFooter('Escolha uma das linhas abaixo')
    .addButton(
        new ListButton('Ver Catálogo')
            .addSection(
                new ListSection('Aparelhos Celulares')
                    .addRow(new ListRow('iphone_15', 'iPhone 15 Pro', 'Mais recente lançamento Apple'))
                    .addRow(new ListRow('s24_ultra', 'Galaxy S24 Ultra', 'Processador Snapdragon e AI integrada'))
            )
            .addSection(
                new ListSection('Acessórios')
                    .addRow(new ListRow('airpods_3', 'AirPods 3', 'Áudio espacial de alta qualidade'))
            )
    );

await client.messages.sendMessage(jid, listMenu.build());
```

---

## 📄 Licença

Este projeto está licenciado sob a licença **ISC**. Consulte o arquivo [LICENSE](LICENSE) para obter detalhes.

---
Desenvolvido com carinho por **Áreum Tecnologia**.
