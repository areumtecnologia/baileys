// Biblioteca chamada @areumtecnologia/baileys

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
    fetchMessageHistory
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

const { MessageNormalizer, MessageStore } = require('./utils');
const { InteractiveMessage, CallButton, CopyCodeButton, ListButton, ListRow, ListSection, QuickReplyButton, UrlButton, LocationButton } = require('./types/interactive-messages');
const NodeCache = require("node-cache");
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

/**
 * Representa um wrapper de alto nível para a biblioteca Baileys, simplificando a criação e o gerenciamento de um cliente de WhatsApp.
 * A classe abstrai a complexidade do ciclo de vida da conexão e emite eventos semânticos para todas as interações importantes.
 * 
 * @extends {EventEmitter}
 * 
 * @fires Client#status
 * @fires Client#error
 * @fires Client#message_received
 * @fires Client#message_sent
 * @fires Client#message_update
 * @fires Client#message_delete
 * @fires Client#message_reaction
 * @fires Client#incoming_call
 * @fires Client#group_update
 * @fires Client#group_participants_update
 * @fires Client#presence_update
 * @fires Client#chat_update
 * @fires Client#chat_delete
 * @fires Client#contact_update
 * @fires Client#blocklist_update
 */
class Client extends EventEmitter {
    /**
     * Cria uma instância do Cliente.
     * @param {object} [options={}] - Opções de configuração para o cliente.
     * @param {string} [options.sessionName='session'] - O nome da sessão a ser usada, que nomeia a pasta de autenticação.
     */
    constructor(options = {}) {
        super();
        this.sock = null;
        this.dataPath = options.dataPath || ".baileys/sessions";
        this.sessionName = options.sessionName;
        this.sessionPath = [this.dataPath, this.sessionName].join('/');
        this.store = options.store ? options.store : new MessageStore(this.sessionPath);
        this.isOnline = false;
        this.connected = false;
        this.manualDisconnect = false;
        this.receivedPendingNotifications = false;
        this.loggerLevel = options.loggerLevel || "error";
        this.restartOnClose = options.restartOnClose || false;
        this.status = ClientEvent.DISCONNECTED;
        this.markOnlineOnConnect = options.markOnlineOnConnect || false;
        this.environment = options.environment ? options.environment : null;
        this.printQRInTerminal = options.printQRInTerminal || false;
        this.qrCode = null;
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
    }

    /**
     * Inicia o cliente, configura a autenticação e estabelece a conexão com o WhatsApp.
     * Gerencia todo o ciclo de vida da conexão, incluindo reconexão automática e solicitação de novo QR code.
     * @returns {Promise<void>}
     */
    async connect() {
        this.status = ClientEvent.INIT;
        const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            auth: state,
            version,
            browser: this.environment ? this.environment : Browsers.macOS("Desktop"),
            logger: pino({ level: this.loggerLevel }),
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
                this.status = ClientEvent.PAIRING_CODE;
                this.emit(ClientEvent.PAIRING_CODE, this.qrCode);
                this.emit(ClientEvent.STATUS_CHANGE, this.status);
                this.printQRInTerminal ? qrcodeTerminal.generate(qr, { small: true }) : null;
                return;
            }

            // intercepta a configuração de pairing e reinicio de conexao apos login bem sucedido...
            if (isNewLogin && qr == undefined) {
                this.qrCode = null;
                this.status = ClientEvent.PAIRING_SUCCESS;
                this.emit(ClientEvent.PAIRING_SUCCESS, update);
                this.emit(ClientEvent.STATUS_CHANGE, this.status);
                return;
            }

            // Dentro de 'connection.update'
            switch (connection) {
                case 'connecting':
                    this.status = ClientEvent.CONNECTING;
                    this.emit(ClientEvent.CONNECTING, update);
                    this.emit(ClientEvent.STATUS_CHANGE, this.status);
                    break;

                case 'open':
                    this.connected = true;
                    this.status = ClientEvent.CONNECTED;
                    this.manualDisconnect = false;
                    this.qrCode = null;
                    this.user = await this.itsMe();
                    this.emit(ClientEvent.CONNECTED, this.user);
                    this.emit(ClientEvent.STATUS_CHANGE, this.status);
                    this.presenceSetInterval = setInterval(() => {
                        if (this.sock?.sendPresenceUpdate) {
                            this.sock.sendPresenceUpdate('available').catch(() => { });
                        }
                    }, 30_000);
                    break;

                case 'close':
                    // Cancelar o intervalo
                    if (this.presenceSetInterval) {
                        clearInterval(this.presenceSetInterval);
                        this.presenceSetInterval = null;
                    }
                    // Aqui entraria a lógica que já existe para tratar a desconexão
                    this.qrCode = null;
                    this.connected = false;
                    let disconnectReason, statusType;
                    const boomError = new Boom(lastDisconnect?.error);
                    const statusCode = boomError?.output?.statusCode;
                    const reasonType = boomError.data?.content?.[0]?.attrs?.type || boomError.data?.attrs?.type || 'unknown';

                    // Conexao fechada apos leitura bem-sucedida do qrcode para que uma nova conexao seja feita. Nao ha necessidade de disparar evento de desconexao
                    if (statusCode === DisconnectReason.restartRequired) {
                        return this.connect();
                    }

                    if (this.manualDisconnect) {
                        // Desconexão manual solicitada pelo cliente.
                        statusType = DisconnectReasons.MANUAL_DISCONNECT;
                        disconnectReason = { statusCode, statusType, reason: reasonType, details: lastDisconnect };
                    } else if (statusCode === DisconnectReason.loggedOut) {
                        // 'Sessão deslogada por motivo desconhecido.'
                        statusType = DisconnectReasons.LOGGED_OUT;
                        disconnectReason = { statusCode, statusType, reason: reasonType, details: boomError.data };
                        try {
                            await fs.rm(this.sessionPath, { recursive: true, force: true });
                            // if (this.restartOnClose) this.connect();
                        } catch (err) {
                            this.emit(ClientEvent.ERROR, err);
                        }
                    } else if (statusCode === 408) {
                        // 'Sessão deslogada por motivo desconhecido.'
                        statusType = DisconnectReasons.PAIRING_FAILED;
                        disconnectReason = { statusCode, statusType, reason: 'qr_read_attempts_ended', details: boomError.data };
                    } else {
                        //'Conexão perdida por erro ou instabilidade.'
                        statusType = DisconnectReasons.CONNECTION_ERROR;
                        disconnectReason = { statusCode, statusType, reason: reasonType, details: lastDisconnect?.error };
                    }

                    this.status = ClientEvent.DISCONNECTED;
                    this.emit(ClientEvent.DISCONNECTED, disconnectReason);
                    this.emit(ClientEvent.STATUS_CHANGE, this.status);
                    // Reinicia a conexao se o servidor originar desconexao, especialmente 503
                    if (statusCode === DisconnectReason.unavailableService) {
                        return this.connect();
                    }

                    // Lógica de reconexão em caso de erros desconhecidos
                    if (statusType === DisconnectReasons.CONNECTION_ERROR) {
                        this.emit(ClientEvent.ERROR, update);
                        if (this.restartOnClose) {
                            this.connect();
                        }
                    }
                    break;
            }

        });

        // =================================================================================================
        //                                    OUTROS EVENTOS DE INTERAÇÃO
        // =================================================================================================

        this.sock.ev.on('call', ([call]) => {
            this.emit(ClientEvent.CALL, this.calls.normalizeCall(call));
        });
        this.sock.ev.on('groups.update', async ([event]) => {
            this.emit(ClientEvent.GROUP_UPDATE, event);
            let contact = await this.contacts.get(event.id);
            if (!contact) {
                contact = await this.contacts.normalize({ key: { remoteJid: event.id, fromMe: false } });
                this.contacts.set(contact.id, contact);
            }
            groupCache.set(event.id, contact.metadata);
        });

        this.sock.ev.on('group-participants.update', async (event) => {
            this.emit(ClientEvent.GROUP_PARTICIPANTS_UPDATE, event);
            let contact = await this.contacts.get(event.id);
            if (!contact) {
                contact = await this.contacts.normalize({ key: { remoteJid: event.id, fromMe: false } });
                this.contacts.set(contact.id, contact);
            }
            groupCache.set(event.id, contact.metadata);
        });

        this.sock.ev.on('presence.update', (event) => this.emit(ClientEvent.PRESENCE_UPDATE, event));
        this.sock.ev.on('contacts.update', async (event) => {
            this.emit(ClientEvent.CONTACT_UPDATE, event);
            // event é um array de objetos {id, imgUrl, name, etc}. 
            // Filtrar apenas os objetos que tiverem propriedades contendo valores igual a 'changed'
            const cs = event.filter(c => Object.values(c).some(v => v === 'changed'));
            for (const c of cs) {
                let jid = c.id;
                if (c.id.endsWith('@lid')) {
                    jid = await this.users.getPnForLid(c.id);
                }
                let contact = jid ? await this.contacts.get(jid) : null;
                if (!contact) {
                    contact = await this.contacts.normalize({ key: { remoteJid: jid } });
                }
                this.contacts.set(contact.id, contact);
            }
        });
        this.sock.ev.on('blocklist.update', (event) => this.emit(ClientEvent.BLOCKLIST_UPDATE, event));
        this.sock.ev.on('chats.update', (event) => this.emit(ClientEvent.CHAT_UPDATE, event));
        this.sock.ev.on('chats.delete', (event) => this.emit(ClientEvent.CHAT_DELETE, event));

        this.sock.ev.on('messaging-history.set', async (history) => {
            try {

                for (const chat of history.chats) {
                    const chatId = chat.id;
                    const contact = await this.contacts.normalize({ key: { remoteJid: chatId } });
                    this.contacts.set(contact.id, contact);
                    const messages = history.messages.filter(m => m.key.remoteJid === chatId);
                    for (const msg of messages) {
                        const nmsg = MessageNormalizer.normalize(contact, msg, this);
                        if (nmsg && this.store && this.store?.setMessage) this.store?.setMessage(chatId, nmsg);
                    }
                }
                this.emit(ClientEvent.MESSAGES_HISTORY_SYNC_DONE, history);

            } catch (error) {
                this.emit(ClientEvent.ERROR, error);
            }
        });
        this.sock.ev.on('messages.update', (event) => this.emit(ClientEvent.MESSAGE_UPDATE, event));
        this.sock.ev.on('messages.delete', (event) => this.emit(ClientEvent.MESSAGE_DELETE, event));
        this.sock.ev.on('messages.reaction', (event) => this.emit(ClientEvent.MESSAGE_REACTION, event));
        this.sock.ev.on('messages.upsert', async (event) => {
            try {
                const { messages, type } = event;
                const msg = messages[0];

                if (!msg.message || msg.message.protocolMessage) {
                    this.emit(ClientEvent.NOTIFICATION, msg);
                } else {
                    let contact = await this.contacts.get(msg.key.remoteJid);
                    if (!contact) {
                        contact = await this.contacts.normalize(msg); // msg ja contem tudo que precisa
                        this.contacts.set(contact.id, contact);
                    }
                    if (msg.broadcast || msg.key.remoteJid == 'status@broadcast') {
                        this.emit(ClientEvent.BROADCAST_MESSAGE, msg);
                    } else {
                        const nmsg = await MessageNormalizer.normalize(contact, msg, this);
                        if (nmsg && this.store && this.store?.setMessage) {
                            this.store?.setMessage(nmsg.chatId, nmsg);
                        }
                        // Mensagens de conversacao
                        switch (type) {
                            case 'append':
                                this.emit(ClientEvent.MESSAGE_SENT, nmsg);
                                break;

                            case 'notify':
                                if (msg.key.fromMe) {
                                    this.emit(ClientEvent.MESSAGE_SENT, nmsg);
                                } else {
                                    this.emit(ClientEvent.MESSAGE_RECEIVED, nmsg);
                                }

                                break;
                            default:
                                this.emit(ClientEvent.NOTIFICATION, nmsg);
                                break;
                        }

                    }
                }
            } catch (error) {
                this.emit(ClientEvent.ERROR, { error, event });
            }

        });
    }

    /**
     * @returns {Promise<object>} - Um objeto contendo as informações do contato.
     */
    async itsMe() {
        if (!this.sock.user) return null;
        const wid = this.sock.user.id.replace(/:.*?@/, "@");
        return await this.contacts.normalize({ key: { remoteJid: wid, fromMe: true } });
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
            this.emit(ClientEvent.ERROR, error);
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
            this.emit(ClientEvent.ERROR, err);
        }
    }

    /**
     * Valida a conexão antes de executar uma ação.
     * @private
     * @throws {Error} Se o cliente não estiver conectado.
     */
    _validateConnection() {
        if (!this.sock || this.status !== ClientEvent.CONNECTED) {
            throw new Error('Cliente não está conectado.', { cause: this.status });
        }
    }

    // Metodos usados pelos handlers
    async decryptPollVote(vote, voteParams) {
        return await decryptPollVote(vote, voteParams);
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

    async fileExists(path) {
        try {
            await fs.access(path, constants.F_OK);
            return true;
        } catch {
            return false;
        }
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
 * Enumeração estática dos eventos emitidos pelo Client.
 */
class ClientEvent {
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
    static GROUP_UPDATE = 'group_update';
    static GROUP_PARTICIPANTS_UPDATE = 'group_participants_update';
    static PRESENCE_UPDATE = 'presence_update';
    static CHAT_UPDATE = 'chat_update';
    static CHAT_DELETE = 'chat_delete';
    static CONTACT_UPDATE = 'contact_update';
    static BLOCKLIST_UPDATE = 'blocklist_update';
    static PAIRING_CODE = 'pairing_code';
    static PAIRING_SUCCESS = 'pairing_success';
    static DISCONNECTED = 'disconnected';
    static CONNECTED = 'connected';
    static MESSAGES_HISTORY_SYNC_DONE = 'messages_history_sync_done';
    static BROADCAST_MESSAGE = 'broadcast_message';
    static NOTIFICATION = 'notification';
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
}

module.exports = {
    Client,
    PresenceStatus,
    ClientEvent,
    DisconnectReasons,
    InteractiveMessage,
    QuickReplyButton,
    UrlButton,
    CopyCodeButton,
    CallButton,
    ListButton,
    ListSection,
    ListRow,
    LocationButton
}