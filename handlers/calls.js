
/**
 * @copyright Áreum Tecnologia
 * @author Áreum Tecnologia
 * @license Proprietary
 * 
 * Manipula o envio e recebimento de chamadas via WhatsApp utilizando Baileys.
 * Fornece métodos para envio de texto, mídia, localização, contatos, enquetes, ações de mensagem e interatividade.
 * 
 * @class CallHandler
 * @classdesc Classe central para manipulação de chamadas no WhatsApp.
 * 
 * @property {import('../client').default} client - Instância principal do cliente Baileys.
 * 
 * @example
 * const CallHandler = require('./handlers/calls');
 * const handler = new CallHandler(client);
 * await handler.callReject('5511999999999@s.whatsapp.net');
 */
// const { sendButtons, sendInteractiveMessage } = require('baileys_helper');
const { Utils, MessageNormalizer } = require('../utils');

class CallHandler {
    /**
     * @param {import('../../../client').default} client - A instância principal do cliente.
     */
    constructor(client) {
        this.client = client;
    }

    /** 
     * Rejeita uma chamada.
     * @param {string} jid - O JID do destinatário.
     */
    async reject(call) {
        this.client._validateConnection();
        return this.client.sock.rejectCall(call.id, call.from);

    }

    normalizeCall(call) {
        return {
            id: call.id,
            from: call.from,
            status: call.status,
            isVideo: call.isVideo,
            isGroup: call.isGroup,
            groupJid: call.groupJid,
            date: call.date,
            offline: call.offline,
            chatId: call.chatId,
            reject: this.reject.bind(this, call)
        };
    }

}

module.exports = CallHandler;