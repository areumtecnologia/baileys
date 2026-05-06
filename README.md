# @areumtecnologia/baileys

[![npm version](https://img.shields.io/npm/v/@areumtecnologia/baileys.svg)](https://www.npmjs.com/package/@areumtecnologia/baileys)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Uma biblioteca de alto nível (wrapper) para a [Baileys](https://github.com/WhiskeySockets/Baileys), facilitando a criação e o gerenciamento de bots para WhatsApp com uma interface baseada em eventos e handlers especializados.

## ✨ Características

-   🚀 **Fácil de usar**: Abstrai a complexidade do ciclo de vida da conexão.
-   📩 **Baseado em Eventos**: Emite eventos semânticos para mensagens, status, chamadas e muito mais.
-   🛠️ **Handlers Especializados**: Módulos dedicados para mensagens, grupos, usuários, chamadas e newsletters.
-   🔘 **Mensagens Interativas**: Suporte nativo para botões de resposta rápida, listas, URLs e CTAs.
-   📂 **Gerenciamento de Sessão**: Suporte multi-sessão com persistência automática.

## 📦 Instalação

```bash
npm install @areumtecnologia/baileys
```

## 🚀 Início Rápido

```javascript
const { Client, ClientEvent } = require('@areumtecnologia/baileys');

// Inicializa o cliente
const client = new Client({
    sessionName: 'minha-sessao',
    printQRInTerminal: true // Exibe o QR Code no terminal para autenticação
});

// Evento disparado quando o cliente está conectado e pronto
client.on(ClientEvent.CONNECTED, (user) => {
    console.log(`Conectado como: ${user.name} (${user.id})`);
});

// Escutando mensagens recebidas
client.on(ClientEvent.MESSAGE_RECEIVED, async (message) => {
    console.log(`Mensagem de ${message.from}: ${message.text}`);

    if (message.text === '!ping') {
        // Envia uma resposta simples
        await client.messages.sendTextMessage(message.from, 'pong! 🏓');
    }
});

// Inicia a conexão
client.connect();
```

## ⚙️ Configuração

Ao instanciar o `Client`, você pode passar as seguintes opções:

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `sessionName` | `string` | `'session'` | Nome da pasta onde os dados da sessão serão salvos. |
| `dataPath` | `string` | `'.baileys/sessions'` | Caminho base para salvar as sessões. |
| `printQRInTerminal` | `boolean` | `false` | Se deve imprimir o QR Code no terminal. |
| `loggerLevel` | `string` | `'error'` | Nível de log do Pino (`'debug'`, `'info'`, `'error'`, etc). |
| `restartOnClose` | `boolean` | `false` | Se deve tentar reconectar automaticamente ao desconectar. |
| `markOnlineOnConnect` | `boolean` | `false` | Se deve marcar o bot como online ao conectar. |

## 🔔 Eventos Principais

O cliente emite diversos eventos através da classe `ClientEvent`:

-   `CONNECTED`: Conexão estabelecida com sucesso.
-   `DISCONNECTED`: Cliente desconectado.
-   `MESSAGE_RECEIVED`: Nova mensagem recebida.
-   `MESSAGE_SENT`: Mensagem enviada pelo bot.
-   `MESSAGE_UPDATE`: Mensagem editada ou atualizada.
-   `MESSAGE_DELETE`: Mensagem apagada.
-   `MESSAGE_REACTION`: Reação a uma mensagem.
-   `CALL`: Chamada de voz ou vídeo recebida.
-   `GROUPS_UPDATE`: Atualização em metadados de grupos.
-   `PRESENCE_UPDATE`: Atualização de status (online, digitando...).
-   `CONTACTS_UPDATE`: Atualização na lista de contatos.
-   `QR_CODE`: Novo QR Code gerado.

---

## 📚 Referência de API

A biblioteca organiza suas funcionalidades em handlers acessíveis pela instância do `client`.

### 📩 Mensagens (`client.messages`)

Manipula o envio, recebimento e ações sobre mensagens.

-   `sendTextMessage(jid, text, options)`: Envia uma mensagem de texto simples.
-   `sendMessage(jid, content, options)`: Método genérico para enviar qualquer conteúdo da Baileys.
-   `reply(originalMessage, content)`: Responde a uma mensagem específica.
-   `sendImage(jid, media, caption, options)`: Envia uma imagem (URL ou Buffer).
-   `sendVideo(jid, media, caption, options)`: Envia um vídeo.
-   `sendAudio(jid, media, ptt, options)`: Envia áudio (ptt: true para mensagem de voz).
-   `sendDocument(jid, media, mimetype, fileName, caption, options)`: Envia documentos.
-   `sendLocation(jid, latitude, longitude, name, address)`: Envia uma localização.
-   `sendContacts(jid, contacts)`: Envia cartões de contato.
-   `sendPoll(jid, pollName, pollValues, options)`: Cria uma enquete.
-   `sendLink(jid, url, options)`: Envia um link com preview.
-   `forwardMessage(jid, messageToForward)`: Encaminha uma mensagem.
-   `editMessage(originalMessageKey, newText)`: Edita uma mensagem enviada.
-   `react(messageKey, emoji)`: Reage com emoji.
-   `delete(messageKey)`: Apaga uma mensagem para todos.
-   `read(messageKey)`: Marca mensagem como lida.
-   `getAttachments(message)`: Baixa a mídia da mensagem e retorna utilitários (toBase64, save, etc).
-   `getMessages(jid, limit)`: Busca o histórico de mensagens de um chat.

### 👥 Grupos (`client.groups`)

Gerenciamento completo de grupos.

-   `getMetadata(groupId)`: Obtém informações detalhadas do grupo.
-   `getAllGroups()`: Lista todos os grupos que o bot participa.
-   `getProfilePicture(jid)`: Obtém a foto de perfil do grupo.
-   `create(subject, participantsJids)`: Cria um novo grupo.
-   `leave(groupId)`: Sai de um grupo.
-   `updateName(groupId, newName)`: Altera o nome do grupo.
-   `updateDescription(groupId, newDescription)`: Altera a descrição.
-   `updateParticipants(groupId, participantsJids, action)`: Adiciona, remove ou promove membros.
-   `removeParticipants(groupId, participantsJids)`: Remove participantes de um grupo.
-   `addParticipants(groupId, participantsJids)`: Adiciona participantes a um grupo.
-   `promoteParticipants(groupId, participantsJids)`: Promove participantes de um grupo.
-   `demoteParticipants(groupId, participantsJids)`: Rebaixa participantes de um grupo.
-   `getInviteCode(groupId)`: Obtém o código de convite.
-   `revokeInviteCode(groupId)`: Revoga o código de convite.

### 👤 Usuários (`client.users`)

Informações de perfil e configurações de privacidade.

-   `getMetadata(jid)`: Obtém informações normalizadas de um contato.
-   `getStatus(id)`: Obtém o "Recado" (status) de um usuário.
-   `getPnForLid(lid)`: Converte um LID para JID (PhoneNumber).
-   `getMyStatus()`: Obtém o status do bot.
-   `getBusinessProfile(jid)`: Obtém informações de perfil comercial.
-   `getProfilePicture(jid)`: Obtém a foto de perfil do usuário.
-   `isOnWhatsApp(number)`: Verifica se um número está registrado no WhatsApp.
-   `updateProfileName(newName)`: Altera o nome do bot.
-   `updateProfileStatus(newStatus)`: Altera o recado do bot.
-   `block(jid)`: Bloqueia um contato.
-   `unblock(jid)`: Desbloqueia um contato.
-   `getBlocklist()`: Lista contatos bloqueados.
-   `sendPresence(jid, presenceStatus)`: Envia status de presença (available, composing, etc).

### 📰 Newsletters (`client.newsletters`)

Interação com Canais (Newsletters).

-   `getMetadata(id)`: Obtém metadados do canal.
-   `getAllNewsletters()`: Lista todos os canais que o bot segue.
-   `follow(id)`: Segue um canal.
-   `unfollow(id)`: Deixa de seguir.
-   `mute(jid, duration)` / `unmute(jid)`: Gerencia silenciamento.
-   `create(name, description, picture)`: Cria um canal próprio.
-   `delete(jid)`: Deleta um canal.
-   `updateName(jid, name)`: Atualiza o nome do canal.
-   `updateDescription(jid, description)`: Atualiza a descrição do canal.
-   `updatePicture(jid, picture)`: Atualiza a imagem do canal.
-   `update(jid, { name, description, picture })`: Atualiza múltiplos dados do canal.
-   `updateReactionMode(jid, mode)`: Define quem pode reagir no canal (ALL, BASIC, NONE).

### 📞 Chamadas (`client.calls`)

-   `reject(call)`: Rejeita uma chamada recebida.

### 📇 Contatos (`client.contacts`)

-   `get(jid)`: Obtém um contato do cache local.
-   `getAll()`: Retorna todos os contatos em cache.

---

## 🔘 Mensagens Interativas

Exemplo de como enviar uma mensagem com botões de resposta rápida:

```javascript
const { InteractiveMessage, QuickReplyButton } = require('@areumtecnologia/baileys');

const interactive = new InteractiveMessage()
    .withText('Escolha uma opção:')
    .withFooter('Menu Principal')
    .addButton(new QuickReplyButton('id_1', 'Opção 1'))
    .addButton(new QuickReplyButton('id_2', 'Opção 2'));

await client.messages.sendMessage(jid, interactive.build());
```

## 📄 Licença

Este projeto está licenciado sob a licença ISC. Consulte o arquivo [LICENSE](LICENSE) para obter detalhes.

---
Desenvolvido por **Áreum Tecnologia**.
