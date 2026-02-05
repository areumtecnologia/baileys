
/**
 * @copyright Áreum Tecnologia
 * @author Áreum Tecnologia
 * @license Proprietary
 * 
 * Manipula o gerenciamento de newsletters via WhatsApp utilizando Baileys.
 * 
 * @class NewsletterHandler
 * @classdesc Classe central para manipulação de newsletters no WhatsApp.
 * 
 * @property {import('../client').default} client - Instância principal do cliente Baileys.
 * 
 * @example
 * const NewsletterHandler = require('./handlers/newsletters');
 * const handler = new NewsletterHandler(client);
 * await handler.sendNewsletter('5511999999999@s.whatsapp.net');
 */
// const { sendButtons, sendInteractiveMessage } = require('baileys_helper');
const { Utils, MessageNormalizer } = require('../utils');

class NewsletterHandler {
    /**
     * @param {import('../../../client').default} client - A instância principal do cliente.
     */
    constructor(client) {
        this.client = client;
        this.newsletters = new Map();
    }

    /**
     * Obtém os metadados de uma newsletter.
     * @param {string} id - O ID da newsletter.
     * @returns {Promise<object>} Os metadados da newsletter.
     */
    async getMetadata(id) {
        this.client._validateConnection();
        if (this.newsletters.has(id)) {
            return this.newsletters.get(id);
        }
        let newsletterMetadata;
        if (id.endsWith("@newsletter")) {
            newsletterMetadata = await this.client.sock.newsletterMetadata("jid", id);
        } else {
            newsletterMetadata = await this.client.sock.newsletterMetadata("invite", id);
        }
        this.newsletters.set(id, newsletterMetadata);
        return newsletterMetadata;
    }

    /**
     * Segue uma newsletter.
     * @param {string} id - O ID da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async follow(id) {
        this.client._validateConnection();
        return this.client.sock.newsletterFollow(id);
    }

    /**
     * Deixa de seguir uma newsletter.
     * @param {string} id - O ID da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async unfollow(id) {
        this.client._validateConnection();
        return this.client.sock.newsletterUnfollow(id);
    }

    /**
     * Silencia uma newsletter.
     * @param {string} jid - O JID da newsletter.
     * @param {number} duration - A duração do silenciamento em segundos.
     * @returns {Promise<object>} O resultado da operação.
     */
    async mute(jid, duration) {
        this.client._validateConnection();
        return this.client.sock.newsletterMute(jid, duration);
    }

    /**
     * Remove o silenciamento de uma newsletter.
     * @param {string} jid - O JID da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async unmute(jid) {
        this.client._validateConnection();
        return this.client.sock.newsletterUnmute(jid);
    }

    /**
     * Cria uma newsletter.
     * @param {string} name - O nome da newsletter.
     * @param {string} description - A descrição da newsletter.
     * @param {string} picture - A URL da imagem da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async create(name, description, picture) {
        this.client._validateConnection();
        return this.client.sock.newsletterCreate(name, description, picture);
    }

    /**
     * Deleta uma newsletter.
     * @param {string} jid - O JID da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async delete(jid) {
        this.client._validateConnection();
        return this.client.sock.newsletterDelete(jid);
    }

    /**
     * Atualiza o nome de uma newsletter.
     * @param {string} jid - O JID da newsletter.
     * @param {string} name - O novo nome da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async updateName(jid, name) {
        this.client._validateConnection();
        return this.client.sock.newsletterUpdateName(jid, name);
    }

    /**
     * Atualiza a descrição de uma newsletter.
     * @param {string} jid - O JID da newsletter.
     * @param {string} description - A nova descrição da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async updateDescription(jid, description) {
        this.client._validateConnection();
        return this.client.sock.newsletterUpdateDescription(jid, description);
    }

    /**
     * Atualiza a imagem de uma newsletter.
     * @param {string} jid - O JID da newsletter.
     * @param {string} picture - A nova URL da imagem da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async updatePicture(jid, picture) {
        this.client._validateConnection();
        return this.client.sock.newsletterUpdatePicture(jid, picture);
    }
    /**
     * Atualiza uma newsletter.
     * @param {string} jid - O JID da newsletter.
     * @param {string} name - O novo nome da newsletter.
     * @param {string} description - A nova descrição da newsletter.
     * @param {string} picture - A nova URL da imagem da newsletter.
     * @returns {Promise<object>} O resultado da operação.
     */
    async update(jid, { name, description, picture }) {
        this.client._validateConnection();
        return Promise.all([
            name ? this.client.sock.newsletterUpdateName(jid, name) : Promise.resolve(),
            description ? this.client.sock.newsletterUpdateDescription(jid, description) : Promise.resolve(),
            picture ? this.client.sock.newsletterUpdatePicture(jid, picture) : Promise.resolve()
        ]);
    }
    /**
     * Atualiza o modo de reação de uma newsletter.
     * @param {string} jid - O JID da newsletter.
     * @param {string} mode - O modo de reação da newsletter. ALL, BASIC, NONE
     * @returns {Promise<object>} O resultado da operação.
     */
    async updateReactionMode(jid, mode = "ALL") {
        this.client._validateConnection();
        return this.client.sock.newsletterReactionMode(jid, mode);
    }
}

module.exports = NewsletterHandler;