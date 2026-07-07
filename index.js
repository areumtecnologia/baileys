// Biblioteca chamada @areumtecnologia/unitychat

const {
    Browsers,
    makeWASocket,
    decryptPollVote,
    DisconnectReason,
    jidNormalizedUser,
    downloadContentFromMessage,
    getContentType,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    getOldestMessageInChat,
    fetchMessageHistory,
    getAggregateVotesInPollMessage,
    getAggregateResponsesInEventMessage
} = require('./handlers/baileys');
const { Boom } = require('@hapi/boom');
const EventEmitter = require('events');
const fs = require('fs/promises');
const { constants } = require('fs');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
// Importa os handlers de responsabilidades específicas
const MessageHandler = require('./handlers/messages');
const GroupHandler = require('./handlers/groups');
const CallHandler = require('./handlers/calls');
const NewsletterHandler = require('./handlers/newsletters');
const { UserHandler, PresenceStatus } = require('./handlers/users');
const ContactHandler = require('./handlers/contacts');
const StoriesHandler = require('./handlers/stories');
const LabelsHandler = require('./handlers/labels');
const BusinessHandler = require('./handlers/business');

const { MessageNormalizer, MessageStore } = require('./utils');
const { InteractiveMessage, CallButton, CopyCodeButton, ListButton, ListRow, ListSection, QuickReplyButton, UrlButton, LocationButton, PixButton, CheckoutButton } = require('./types/interactive-messages');
const NodeCache = require("node-cache");
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

/**
 * Representa um wrapper de alto nível para a biblioteca Baileys, simplificando a criação e o gerenciamento de um cliente de WhatsApp.
 * A classe abstrai a complexidade do ciclo de vida da conexão e emite eventos semânticos para todas as interações importantes.
 * 
 * @extends {EventEmitter}
 * 
 * @fires UnityChat#status
 * @fires UnityChat#error
 * @fires UnityChat#message_received
 * @fires UnityChat#message_sent
 * @fires UnityChat#message_update
 * @fires UnityChat#message_delete
 * @fires UnityChat#message_reaction
 * @fires UnityChat#incoming_call
 * @fires UnityChat#GROUPS_UPDATE
 * @fires UnityChat#group_participants_update
 * @fires UnityChat#presence_update
 * @fires UnityChat#chat_update
 * @fires UnityChat#chat_delete
 * @fires UnityChat#contact_update
 * @fires UnityChat#blocklist_update
 */
class UnityChat extends EventEmitter {
    /**
     * Cria uma instância do Cliente.
     * @param {object} [options={}] - Opções de configuração para o cliente.
     * @param {string} [options.sessionName='session'] - O nome da sessão a ser usada, que nomeia a pasta de autenticação.
     */
    constructor(options = {}) {
        super();
        this.sock = null;
        this.dataPath = options.dataPath || "data/sessions";
        this.sessionName = options.sessionName;
        this.sessionPath = [this.dataPath, this.sessionName].join('/');
        this.store = options.store ? options.store : new MessageStore(this.sessionPath);
        this.isOnline = false;
        this.connected = false;
        this.manualDisconnect = false;
        this.receivedPendingNotifications = false;
        this.loggerLevel = options.loggerLevel || "error";
        this.logger = pino({ level: this.loggerLevel });
        this.restartOnClose = options.restartOnClose || false;
        this.status = Events.DISCONNECTED;
        this.markOnlineOnConnect = options.markOnlineOnConnect || false;
        this.environment = options.environment || ['Mac OS', 'Chrome', '144.0.7559.110'];
        this.printQRInTerminal = options.printQRInTerminal || false;
        this.qrCode = null;
        this.waVersion = options.waVersion || [2, 3000, 1038819500];
        // =================================================================================================
        //                                     INTEGRAÇÃO DOS HANDLERS
        // =================================================================================================
        // Instancia os handlers, passando a si mesma (this) como referência.
        // Isso permite que os handlers acessem o 'sock' e outros métodos do cliente.
        this.groups = new GroupHandler(this);
        this.users = new UserHandler(this);
        this.calls = new CallHandler(this);
        this.newsletters = new NewsletterHandler(this);
        this.contacts = new ContactHandler(this);
        this.messages = new MessageHandler(this);
        this.stories = new StoriesHandler(this);
        this.labels = new LabelsHandler(this);
        this.business = new BusinessHandler(this);
    }

    /**
     * Inicia o cliente, configura a autenticação e estabelece a conexão com o WhatsApp.
     * Gerencia todo o ciclo de vida da conexão, incluindo reconexão automática e solicitação de novo QR code.
     * @returns {Promise<void>}
     */
    async connect() {
        this.status = Events.INIT;
        const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        this.waVersion = this.waVersion || version
        this.sock = makeWASocket({
            auth: state,
            version: this.waVersion,
            browser: this.environment,
            syncFullHistory: false,
            logger: this.logger,
            markOnlineOnConnect: this.markOnlineOnConnect || false,
            keepAliveIntervalMs: 20000,
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
            cachedGroupMetadata: async (jid) => groupCache.get(jid),
            getMessage: async (key) => {
                const chatId = key.remoteJid;
                const msg = this.store?.getMessage(chatId, key.id);
                // precisa retornar o raw.message
                return msg ? msg.raw?.message : undefined;
            }
        });

        // =================================================================================================
        //                                     EVENTO CENTRALIZADO DE CICLO DE VIDA
        // =================================================================================================

        /**
         * Disparado quando as credenciais são atualizadas.
         * O handler `saveCreds` da Baileys cuida de persistir essas credenciais.
         */
        this.sock.ev.on('creds.update', saveCreds);

        /**
         * Gerencia TODAS as atualizações do estado da conexão, emitindo um evento 'status' padronizado.
         */
        this.sock.ev.on('connection.update', async (update) => {

            const { connection, isOnline, receivedPendingNotifications, lastDisconnect, qr, isNewLogin } = update;

            if (receivedPendingNotifications)
                this.receivedPendingNotifications = true;

            if (isOnline)
                this.isOnline = true;

            if (qr) {
                this.qrCode = qr;
                const base64 = await QRCode.toDataURL(qr);
                this.qrCodeAttempts = (this.qrCodeAttempts || 0) + 1;
                this.qrCode = { base64, qr, attempts: this.qrCodeAttempts };
                this.status = Events.PAIRING_CODE;
                this.emit(Events.PAIRING_CODE, this.qrCode);
                this.emit(Events.STATUS_CHANGE, this.status);
                this.printQRInTerminal ? qrcodeTerminal.generate(qr, { small: true }) : null;
                return;
            }

            // intercepta a configuração de pairing e reinicio de conexao apos login bem sucedido...
            if (isNewLogin && qr == undefined) {
                this.qrCode = null;
                this.status = Events.PAIRING_SUCCESS;
                this.emit(Events.PAIRING_SUCCESS, update);
                this.emit(Events.STATUS_CHANGE, this.status);
                return;
            }

            // Dentro de 'connection.update'
            switch (connection) {
                case 'connecting':
                    this.status = Events.CONNECTING;
                    this.emit(Events.CONNECTING, update);
                    this.emit(Events.STATUS_CHANGE, this.status);
                    break;

                case 'open':
                    this.connected = true;
                    this.status = Events.CONNECTED;
                    this.manualDisconnect = false;
                    this.qrCode = null;
                    this.user = await this.itsMe();
                    this.emit(Events.CONNECTED, this.user);
                    this.emit(Events.STATUS_CHANGE, this.status);
                    this.presenceSetInterval = setInterval(() => {
                        if (this.sock?.sendPresenceUpdate) {
                            this.sock.sendPresenceUpdate('available').catch(() => { });
                        }
                    }, 30_000);
                    break;

                case 'close': {
                    // limpar presença
                    if (this.presenceSetInterval) {
                        clearInterval(this.presenceSetInterval);
                        this.presenceSetInterval = null;
                    }

                    this.connected = false;
                    this.qrCode = null;

                    const boomError = new Boom(lastDisconnect?.error);
                    const statusCode = boomError?.output?.statusCode;
                    const statusError = boomError?.output?.error;
                    const reasonType =
                        boomError?.data?.content?.[0]?.attrs?.type ||
                        boomError?.data?.attrs?.type ||
                        'unknown';

                    let statusType;
                    let shouldReconnect = false;

                    switch (statusCode) {

                        /** Logout explícito (401)*/
                        case DisconnectReason.loggedOut:
                            statusType = DisconnectReasons.LOGGED_OUT;
                            shouldReconnect = this.restartOnClose;
                            try {
                                await fs.rm(this.sessionPath, { recursive: true, force: true });
                            } catch {
                                // Erro se nao existir
                            }
                            break;

                        // 403: Banido ou proibido
                        case DisconnectReason.forbidden:
                            statusType = DisconnectReasons.FORBIDDEN;
                            shouldReconnect = false; //nao pode reconectar, so recriar sessao do 0
                            try {
                                await fs.rm(this.sessionPath, { recursive: true, force: true });
                            } catch {
                                // Erro se nao existir
                            }
                            break;
                        // 405: Nao autorizado
                        case 405:
                            statusType = DisconnectReasons.UNAUTHORIZED;
                            shouldReconnect = false;
                            try {
                                await fs.rm(this.sessionPath, { recursive: true, force: true });
                            } catch (error) {
                                // Erro se nao existir
                            }
                            break;

                        /** Outra instância assumiu a sessão */
                        case DisconnectReason.connectionReplaced:
                            statusType = DisconnectReasons.CONNECTION_REPLACED;
                            shouldReconnect = false;
                            break;

                        /** 🧩 Incompatibilidade Multi-Device (418)*/
                        case DisconnectReason.multideviceMismatch:
                            statusType = DisconnectReasons.MULTIDEVICE_MISMATCH;
                            shouldReconnect = false;
                            break;
                        /** ⏱ Timeout (408) - Exemplo: Leitura de QrCode expirada*/
                        case DisconnectReason.timedOut:
                            statusType = DisconnectReasons.TIMEOUT;
                            shouldReconnect = this.status === Events.PAIRING_CODE ? false : true;
                            break;
                        /** 🔌 Conexão perdida (401) */
                        case DisconnectReason.connectionLost:
                        case DisconnectReason.connectionClosed:
                            statusType = DisconnectReasons.CONNECTION_LOST;
                            shouldReconnect = true;
                            break;

                        /** Sessão inválida / corrompida (500) */
                        case DisconnectReason.badSession:
                            statusType = DisconnectReasons.BAD_SESSION;
                            shouldReconnect = false;
                            try {
                                await fs.rm(this.sessionPath, { recursive: true, force: true });
                            } catch { }
                            break;
                        /** 🌐 Serviço indisponível (503) */
                        case DisconnectReason.unavailableService:
                            statusType = DisconnectReasons.SERVICE_UNAVAILABLE;
                            shouldReconnect = true;
                            break;
                        /** WhatsApp pediu restart explícito (515)*/
                        case DisconnectReason.restartRequired:
                            return this.connect();

                        /** ❓ Qualquer outro caso */
                        default:
                            statusType = DisconnectReasons.UNKNOWN;
                            shouldReconnect = this.restartOnClose;
                            break;
                    }

                    const disconnectReason = {
                        statusCode,
                        statusType,
                        reason: reasonType,
                        details: lastDisconnect?.error,
                    };

                    this.status = Events.DISCONNECTED;
                    this.emit(Events.DISCONNECTED, disconnectReason);
                    this.emit(Events.STATUS_CHANGE, this.status, disconnectReason);

                    if (shouldReconnect && this.restartOnClose && !this.manualDisconnect) {
                        try {
                            await this.connect();
                        } catch (err) {
                            this.emit(Events.ERROR, err);
                        }
                    }

                    break;
                }

            }

        });

        // =================================================================================================
        //                                    OUTROS EVENTOS DE INTERAÇÃO
        // =================================================================================================

        this.sock.ev.on('call', ([call]) => {
            this.emit(Events.CALL, this.calls.normalizeCall(call));
        });
        this.sock.ev.on('groups.upsert', async (groups) => {
            this.emit(Events.GROUPS_UPSERT, groups);
            groups.forEach((group) => {
                this.groups.store.set(group.id, group);
            });
        });

        this.sock.ev.on('groups.update', async (grupos) => {
            if (!this.user?.groups) return;
            const gp = [];
            for (const g of grupos) {
                let contact = await this.contacts.get(g.id);
                contact = await this.contacts.normalize({ key: { remoteJid: g.id, fromMe: false } });
                if (contact && contact.id && contact.name && contact.id !== this.user?.id) {
                    this.contacts.set(contact.id, contact);
                }
                this.groups.store.set(g.id, contact.metadata);
                groupCache.set(g.id, contact.metadata);
                gp.push(contact.metadata);
            }
            this.emit(Events.GROUPS_UPDATE, gp);
        });

        this.sock.ev.on('group-participants.update', async (event) => {
            this.emit(Events.GROUP_PARTICIPANTS_UPDATE, event);
            let contact = await this.contacts.get(event.id);
            if (!contact) {
                contact = await this.contacts.normalize({ key: { remoteJid: event.id, fromMe: false } });
                if (contact && contact.id && contact.name && contact.id !== this.user?.id) {
                    this.contacts.set(contact.id, contact);
                }
            }
            this.groups.store.set(event.id, contact.metadata);
        });

        this.sock.ev.on('presence.update', (event) => this.emit(Events.PRESENCE_UPDATE, event));
        this.sock.ev.on('group.member-tag.update', (update) => this.emit(Events.GROUP_MEMBER_TAG_UPDATE, update));
        this.sock.ev.on('contacts.upsert', (contacts) => this.emit(Events.CONTACTS_UPSERT, contacts));
        this.sock.ev.on('contacts.update', async (event) => {
            const cxs = [];
            // event é um array de objetos {id, imgUrl, name, etc}. 
            // Filtrar apenas os objetos que tiverem propriedades contendo valores igual a 'changed'
            const cs = event.filter(c => Object.values(c).some(v => v === 'changed'));
            for (const c of cs) {
                let jid = null; // jid sempre precisa ser pn 123456789@s.whatsapp.net e c.id pode ser 123456789@lid ou 123456789@s.whatsapp.net
                if (c.id.endsWith('@lid')) {
                    jid = await this.users.getPnForLid(c.id);
                } else {
                    jid = c.id;
                }
                // Verifica se o contato existe no cache
                let contact = jid ? await this.contacts.get(jid) : null;
                // Se não existir, normaliza o contato com base no jid
                if (!contact) {
                    contact = await this.contacts.normalize({ key: { remoteJid: jid } });
                }
                // Adiciona contato valido no cache e no array
                if (contact && contact.id && contact.name && contact.id !== this.user?.id) {
                    cxs.push(contact);
                    this.contacts.set(contact.id, contact);
                }
            }
            // So emite o evento se houver contatos atualizados
            if (cxs.length > 0) {
                this.emit(Events.CONTACTS_UPDATE, cxs);
            }
        });
        this.sock.ev.on('blocklist.update', (event) => this.emit(Events.BLOCKLIST_UPDATE, event));
        this.sock.ev.on('chats.update', (event) => this.emit(Events.CHAT_UPDATE, event));
        this.sock.ev.on('chats.delete', (event) => this.emit(Events.CHAT_DELETE, event));

        this.sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest, syncType }) => {
            this.logger.info({ chats: chats.length, contacts: contacts.length, syncType }, 'Sincronização de histórico recebida');
            try {
                // Normaliza os contatos
                for (const contact of contacts) {
                    const chatId = contact.id;
                    const c = await this.contacts.normalize({ key: { remoteJid: chatId } });
                    if (c && c.id && c.name && c.id !== this.user?.id) {
                        this.contacts.set(c.id, c);
                    }
                }
                // Normaliza os chats
                for (const chat of chats) {
                    const chatId = chat.id;
                    const c = await this.contacts.normalize({ key: { remoteJid: chatId } });
                    if (c && c.id && c.name && c.id !== this.user?.id) {
                        this.contacts.set(c.id, c);
                    }
                    const chatMessages = messages.filter(m => m.key.remoteJid === chatId);
                    for (const msg of chatMessages) {
                        const nmsg = await MessageNormalizer.normalize(c, msg, this);
                        if (nmsg && this.store) {
                            if (this.store.saveMessage) {
                                await this.store.saveMessage(chatId, nmsg);
                            } else if (this.store.setMessage) {
                                await this.store.setMessage(chatId, nmsg);
                            }
                        }
                    }
                }
                this.emit(Events.MESSAGES_HISTORY_SYNC_DONE, { chats, contacts, messages, isLatest, syncType });

            } catch (error) {
                this.emit(Events.ERROR, error);
            }
        });
        this.sock.ev.on('messages.update', (event) => this.emit(Events.MESSAGE_UPDATE, event));
        this.sock.ev.on('messages.delete', (event) => this.emit(Events.MESSAGE_DELETE, event));
        this.sock.ev.on('messages.reaction', (event) => this.emit(Events.MESSAGE_REACTION, event));
        this.sock.ev.on('messages.upsert', async (event) => {
            try {
                const { messages, type } = event;
                const msg = messages[0];

                if (!msg.message || msg.message.protocolMessage) {
                    this.emit(Events.NOTIFICATION, msg);
                } else {
                    let contact = await this.contacts.get(msg.key.remoteJid);
                    if (!contact) {
                        contact = await this.contacts.normalize(msg); // msg ja contem tudo que precisa
                    }
                    if (msg.broadcast || msg.key.remoteJid == 'status@broadcast') {
                        this.emit(Events.BROADCAST_MESSAGE, msg);
                    } else {
                        const nmsg = await MessageNormalizer.normalize(contact, msg, this);
                        if (nmsg && this.store) {
                            if (this.store.saveMessage) {
                                await this.store.saveMessage(nmsg.chatId, nmsg);
                            } else if (this.store.setMessage) {
                                await this.store.setMessage(nmsg.chatId, nmsg);
                            }
                        }
                        // Mensagens de conversacao
                        switch (type) {
                            case 'append':
                                this.emit(Events.MESSAGE_SENT, nmsg);
                                break;

                            case 'notify':
                                if (msg.key.fromMe) {
                                    this.emit(Events.MESSAGE_SENT, nmsg);
                                } else {
                                    // So adiciona contato no cache se for recebido
                                    if (contact && contact.id && contact.name && contact.id !== this.user?.id) {
                                        this.contacts.set(contact.id, contact);
                                    }
                                    this.emit(Events.MESSAGE_RECEIVED, nmsg);
                                }

                                break;
                            default:
                                this.emit(Events.NOTIFICATION, nmsg);
                                break;
                        }

                    }
                }
            } catch (error) {
                this.emit(Events.ERROR, { error, event });
            }

        });
    }

    /**
     * @returns {Promise<object>} - Um objeto contendo as informações do contato.
     */
    async itsMe() {
        if (!this.sock.user) return null;
        const wid = this.sock.user.id.replace(/:.*?@/, "@");
        const me = await this.contacts.normalize({ key: { remoteJid: wid, fromMe: true } });
        me.environment = this.environment;
        me.groups = await this.groups.getAllGroups();
        me.newsletters = await this.newsletters.getAllNewsletters();
        return me;
    }

    /**
     * Desconecta o cliente do WhatsApp de forma manual, sem apagar a sessão.
     * @returns {Promise<void>}
     */
    disconnect() {
        try {
            this.manualDisconnect = true;
            return this.sock?.end();
        } catch (error) {
            this.emit(Events.ERROR, error);
        }
    }

    /** Logout e remoção de dados de sessão */
    async logout() {
        try {
            if (this.sock.logout) {
                await this.sock.logout();
            }
            // Aqui você pode adicionar a limpeza local da sessão
        } catch (err) {
            this.emit(Events.ERROR, err);
        }
    }

    /**
     * Valida a conexão antes de executar uma ação.
     * @private
     * @throws {Error} Se o cliente não estiver conectado.
     */
    _validateConnection() {
        if (!this.sock || this.status !== Events.CONNECTED) {
            throw new Error('Cliente não está conectado.', { cause: this.status });
        }
    }

    // Metodos usados pelos handlers
    async decryptPollVote(vote, voteParams) {
        return await decryptPollVote(vote, voteParams);
    }

    async getAggregateVotesInPollMessage(pollParams) {
        const meId = pollParams.meId || this.sock?.user?.id;
        return getAggregateVotesInPollMessage(pollParams, meId);
    }

    async getAggregateResponsesInEventMessage(eventParams) {
        const meLid = eventParams.meLid || this.sock?.user?.lid || this.sock?.user?.id;
        return getAggregateResponsesInEventMessage(eventParams, meLid);
    }

    // Metodos usados pelos handlers
    jidNormalizedUser(id) {
        return jidNormalizedUser(id);
    }

    // Metodos usados pelos handlers
    async downloadContentFromMessage(content, type) {
        return await downloadContentFromMessage(content, type);
    }

    // Metodos usados pelos handlers
    getContentType(message) {
        return getContentType(message);
    }

    // Metodo para enviar notificacao "digitando"
    composing(jid, ts) {
        return this.sock.sendPresenceUpdate('composing', jid);
    }

    async getMessages(jid, limit = 50) {
        const msg = await getOldestMessageInChat(jid)
        return await fetchMessageHistory(
            limit, //quantity (max: 50 per query)
            msg.key,
            msg.messageTimestamp
        )
    }

}

/**
 * Enumeração estática dos eventos emitidos pelo UnityChat.
 */
class Events {
    static INIT = 'init';
    static CONNECTING = 'connecting';
    static STATUS_CHANGE = 'status_change';
    static ERROR = 'error';
    static MESSAGE_RECEIVED = 'message_received';
    static MESSAGE_SENT = 'message_sent';
    static MESSAGE_UPDATE = 'message_update';
    static MESSAGE_DELETE = 'message_delete';
    static MESSAGE_REACTION = 'message_reaction';
    static CALL = 'call';
    static GROUPS_UPDATE = 'GROUPS_UPDATE';
    static GROUP_PARTICIPANTS_UPDATE = 'group_participants_update';
    static GROUPS_UPSERT = 'GROUPS_UPSERT';
    static GROUP_MEMBER_TAG_UPDATE = 'group_member_tag_update';
    static PRESENCE_UPDATE = 'presence_update';
    static CHAT_UPDATE = 'chat_update';
    static CHAT_DELETE = 'chat_delete';
    static CONTACTS_UPSERT = 'contacts_upsert';
    static CONTACTS_UPDATE = 'contacts_update';
    static BLOCKLIST_UPDATE = 'blocklist_update';
    static PAIRING_CODE = 'pairing_code';
    static PAIRING_SUCCESS = 'pairing_success';
    static DISCONNECTED = 'disconnected';
    static CONNECTED = 'connected';
    static MESSAGES_HISTORY_SYNC_DONE = 'messages_history_sync_done';
    static BROADCAST_MESSAGE = 'broadcast_message';
    static NOTIFICATION = 'notification';
}

class SessionStatus {
    static CONNECTING = 'connecting';
    static PAIRING_CODE = 'pairing_code';
    static PAIRING_SUCCESS = 'pairing_success';
    static PAIRING_FAILED = 'pairing_failed';
    static LOGGED_OUT = 'logged_out';
    static CONNECTED = 'connected';
    static DISCONNECTED = 'disconnected';

}

/**
 * Enumeração estática dos motivos de desconexão.
 */
class DisconnectReasons {
    static MANUAL_DISCONNECT = 'manual_disconnect';
    static LOGGED_OUT = 'logged_out';
    static PAIRING_FAILED = 'pairing_failed';
    static CONNECTION_ERROR = 'connection_error';
    static RESTART_REQUIRED = 'restart_required';
    static UNAVAILABLE_SERVICE = 'unavailable_service';
    static UNKNOWN = 'unknown';
    static QR_READ_ATTEMPTS_ENDED = 'qr_read_attempts_ended';
    static BAD_SESSION = 'bad_session';
    static CONNECTION_LOST = 'connection_lost';
    static CONNECTION_CLOSED = 'connection_closed';
    static CONNECTION_REPLACED = 'connection_replaced';
    static MULTIDEVICE_MISMATCH = 'multidevice_mismatch';
    static TIMED_OUT = 'timed_out';
    static UNAUTHORIZED = 'unauthorized';
}

module.exports = {
    UnityChat,
    PresenceStatus,
    Events,
    DisconnectReasons,
    InteractiveMessage,
    QuickReplyButton,
    UrlButton,
    CopyCodeButton,
    CallButton,
    ListButton,
    ListSection,
    ListRow,
    LocationButton,
    PixButton,
    CheckoutButton
}