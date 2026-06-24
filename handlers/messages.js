
/**
 * @copyright Áreum Tecnologia
 * @author Áreum Tecnologia
 * @license Proprietary
 * 
 * Manipula o envio e recebimento de mensagens via WhatsApp utilizando Baileys.
 * Fornece métodos para envio de texto, mídia, localização, contatos, enquetes, ações de mensagem e interatividade.
 * 
 * @class MessageHandler
 * @classdesc Classe central para manipulação de mensagens no WhatsApp.
 * 
 * @property {import('../client').default} client - Instância principal do cliente Baileys.
 * 
 * @example
 * const MessageHandler = require('./handlers/messages');
 * const handler = new MessageHandler(client);
 * await handler.sendTextMessage('5511999999999@s.whatsapp.net', 'Olá!');
 */

const fs = require('fs/promises');
const path = require('path');
const { Utils, MessageNormalizer } = require('../utils');

class MessageHandler {
    /**
     * @param {import('../../../client').default} client - A instância principal do cliente.
     */
    constructor(client) {
        this.client = client;
    }

    /** 
     * Método central de envio de mensagens. Realiza a normalização do JID antes do envio.
     * @private
     */
    async sendMessage(jid, content, options = {}) {
        try {
            this.client._validateConnection();
            const verifiedJid = jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter') ? { jid, exists: true } : await this.client.users.isOnWhatsApp(jid);
            if (verifiedJid && verifiedJid.exists) {
                if (options.composing) {
                    this.client.sock.sendPresenceUpdate('composing', verifiedJid.jid);
                    await new Promise(r => setTimeout(() => r(true), options.composing?.timeout));
                }
                if (options.recording) {
                    this.client.sock.sendPresenceUpdate('recording', verifiedJid.jid);
                    await new Promise(r => setTimeout(() => r(true), options.recording?.timeout));
                }
                const msg = await this.client.sock.sendMessage(verifiedJid.jid, content, options);
                const c = await this.client.contacts.normalize({ key: { remoteJid: verifiedJid.jid } });
                const nmsg = await MessageNormalizer.normalize(c, msg, this.client);
                return nmsg;
            }
            else {
                if (verifiedJid) {
                    return verifiedJid;
                }
                // Se verifiedJid e undefined ou null cria objeto padrao
                return { error: { exists: false, message: "WA_NUMBER_NOT_FOUNDED" } };
            }
        } catch (error) {
            this.client.logger.error({ jid, err: error.message }, 'Erro ao enviar mensagem');
            return { error: { exists: false, message: "SEND_MESSAGE_FAILED", details: error.message } };
        }
    }

    // =================================================================================================
    //                                     MÉTODOS DE ENVIO BÁSICOS
    // =================================================================================================

    /** Envia uma mensagem de texto. */
    async sendTextMessage(jid, text, options = {}) {
        return this.sendMessage(jid, { text }, options);
    }

    /** Responde a uma mensagem específica. */
    async reply(originalMessage, content) {
        const jid = originalMessage.key.remoteJid;
        // Não é necessário normalizar o JID aqui, pois ele vem de uma mensagem existente.
        return this.client.sock.sendMessage(jid, content, { quoted: originalMessage });
    }

    // =================================================================================================
    //                                     MÉTODOS DE ENVIO DE MÍDIA
    // =================================================================================================

    /** Envia uma imagem. */
    async sendImage(jid, media, caption = '', options = {}) {
        const content = {
            image: typeof media === 'string' ? { url: media } : media,
            caption,
            viewOnce: !!options.viewOnce // Adiciona o modificador de visualização única
        };
        return this.sendMessage(jid, content, options);
    }

    /** Envia um vídeo. */
    async sendVideo(jid, media, caption = '', options = {}) {
        const content = {
            video: typeof media === 'string' ? { url: media } : media,
            caption,
            viewOnce: !!options.viewOnce // Adiciona o modificador de visualização única
        };
        return this.sendMessage(jid, content, options);
    }

    /** Envia um áudio (como mensagem de voz). */
    async sendAudio(jid, media, ptt = true, options = {}) {
        const content = {
            audio: typeof media === 'string' ? { url: media } : media,
            mimetype: options.mimetype || 'audio/ogg; codecs=opus',
            ptt
        };
        return this.sendMessage(jid, content, options);
    }

    /** Envia um documento. */
    async sendDocument(jid, media, mimetype, fileName = '', caption = '', options = {}) {
        const content = {
            document: typeof media === 'string' ? { url: media } : media,
            mimetype,
            fileName,
            caption
        };
        return this.sendMessage(jid, content, options);
    }

    // =================================================================================================
    //                             NOVOS MÉTODOS DE MENSAGENS ESTRUTURADAS
    // =================================================================================================

    /** Envia uma localização. */
    async sendLocation(jid, latitude, longitude, name = '', address = '') {
        const content = {
            location: {
                degreesLatitude: latitude,
                degreesLongitude: longitude,
                name: name,
                address: address
            }
        };
        return this.sendMessage(jid, content);
    }

    /** 
     * Envia um ou mais contatos.
     * @param {string} jid - O JID do destinatário.
     * @param {Array<object>} contacts - Um array de contatos.
     * @param {string} contacts[].fullName - O nome completo do contato.
     * @param {string} contacts[].waid - O número de telefone no formato internacional (ex: 5511999999999).
     * @param {string} [contacts[].organization] - A organização do contato (opcional).
     */
    async sendContacts(jid, contacts) {
        const vcards = contacts.map(c => ({
            displayName: c.fullName,
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${c.fullName}\n${c.organization ? `ORG:${c.organization};\n` : ''}TEL;type=CELL;type=VOICE;waid=${c.waid}:+${c.waid.replace(/ /g, '')}\nEND:VCARD`
        }));

        const content = {
            contacts: {
                contacts: vcards
            }
        };
        return this.sendMessage(jid, content);
    }

    /** 
     * Envia uma enquete (poll).
     * @param {string} jid - O JID do destinatário.
     * @param {string} pollName - A pergunta da enquete.
     * @param {string[]} pollValues - Um array com as opções da enquete.
     * @param {object} [options={}] - Opções adicionais.
     * @param {number} [options.selectableCount=1] - Quantas opções podem ser selecionadas. 1 para escolha única, 0 para múltipla escolha.
     */
    async sendPoll(jid, pollName, pollValues, options = {}) {
        const content = {
            poll: {
                name: pollName,
                values: pollValues,
                selectableCount: options.selectableCount === 0 ? 0 : 1
            }
        };
        return this.sendMessage(jid, content);
    }

    /**
     * Envia uma mensagem de link (preview).
     * @param {string} jid - O JID do destinatário.
     * @param {string} url - O link a ser enviado.
     * @param {string} [caption=''] - Texto opcional para acompanhar o link.
     * @param {object} [options={}] - Opções adicionais.
     */
    async sendLink(jid, url, options = {}) {
        return this.sendMessage(jid, { text: url }, options);
    }

    // =================================================================================================
    //                                  MÉTODOS DE AÇÕES DE MENSAGEM
    // =================================================================================================

    /** Encaminha uma mensagem para um JID. */
    async forwardMessage(jid, messageToForward) {
        const content = {
            forward: messageToForward
        };
        return this.sendMessage(jid, content);
    }

    /** Edita o conteúdo de uma mensagem enviada anteriormente pelo bot. */
    async editMessage(originalMessageKey, newText) {
        const jid = originalMessageKey.remoteJid;
        const content = {
            text: newText,
            edit: originalMessageKey
        };
        // Não precisa normalizar, pois o JID vem de uma mensagem existente.
        return this.client.sock.sendMessage(jid, content);
    }

    /** Reage a uma mensagem com um emoji. */
    async react(messageKey, emoji) {
        const reaction = { react: { text: emoji, key: messageKey } };
        return this.sendMessage(messageKey.remoteJid, reaction);
    }

    /** Apaga uma mensagem (enviada pelo bot). */
    async delete(messageKey) {
        return this.sendMessage(messageKey.remoteJid, { delete: messageKey });
    }

    // =================================================================================================
    //                                     MÉTODOS INTERATIVOS E OUTROS
    // =================================================================================================
    /** Envia acoes  */

    // Metodo para enviar notificacao "digitando"
    composing(jid, ts) {
        return this.client.sock.sendPresenceUpdate('composing', jid);
    }

    /** Marca mensagens como lidas. */
    async read(messageKey) {
        this.client._validateConnection();
        return this.client.sock.readMessages([messageKey]);
    }

    /** Faz o download de mídia de uma mensagem. */
    async getAttachments(message) {
        this.client._validateConnection();
        const type = Object.keys(message).find(key => key != "messageContextInfo");
        const messageContent = message[type];

        if (!messageContent?.url) return null;

        // baixa o stream
        const stream = await this.client.downloadContentFromMessage(
            messageContent,
            type.replace('Message', '') // imageMessage → image
        );

        // monta o buffer
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const mimetype = messageContent.mimetype;
        const extension = mimetype.split('/')[1] || 'bin';

        // conversões
        const toBase64 = () => buffer.toString('base64');

        const toDataUri = () =>
            `data:${mimetype};base64,${buffer.toString('base64')}`;

        const toArrayBuffer = () =>
            buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        const toBlob = () => {
            const arrayBuffer = toArrayBuffer();
            return new Blob([arrayBuffer], { type: mimetype });
        };

        const toImageUrl = () => {
            throw new Error('toImageUrl() não é suportada em ambiente Node.js.');
        };

        const toImageBitmap = async () => {
            throw new Error('toImageBitmap() não é suportada em ambiente Node.js.');
        };

        const toStream = () => {
            const { Readable } = require('stream');
            return Readable.from(buffer);
        };

        const toSharp = () => {
            const sharp = require('sharp');
            return sharp(buffer); // o usuário pode continuar com .resize().png()...
        };

        const detectType = async () => {
            const { fileTypeFromBuffer } = await import('file-type');
            return await fileTypeFromBuffer(buffer);
        };

        const save = async (destPath) => {
            const filename = `${message.from}-${Date.now()}.${extension}`;
            const filepath = destPath
                ? destPath
                : `${this.client.sessionPath}/media/${filename}`;

            await fs.mkdir(path.dirname(filepath), { recursive: true });
            await fs.writeFile(filepath, buffer);

            return { filename, filepath };
        };

        return {
            mimetype,
            extension,
            buffer,

            // 🔥 todas as funções utilitárias
            toBase64,
            toDataUri,
            toArrayBuffer,
            toBlob,
            toImageUrl,
            toImageBitmap,
            toStream,
            toSharp,
            detectType,
            save,
        };
    }

    /** Obtem mensagens as ultimas mensagens recebidas de acordo com a biblioteca https://github.com/Itsukichann/Baileys */
    async getMessages(jid, limit = 10) {
        return await this.client.getMessages(jid, limit);
    }
}

module.exports = MessageHandler;