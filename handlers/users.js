
/**
 * @copyright Áreum Tecnologia
 * @file Gerenciador de operações de usuário para o cliente WhatsApp.
 * @module UserHandler
 * 
 * @description
 * Esta classe fornece métodos para manipulação de usuários, incluindo obtenção de status,
 * foto de perfil, verificação de existência no WhatsApp, atualização de perfil, bloqueio/desbloqueio,
 * e envio de atualizações de presença.
 * 
 * @author Áreum Tecnologia
 */
const PresenceStatus = require('./presence-status');

class UserHandler {
    /**
     * @param {import('../../../client').default} client - A instância principal do cliente.
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * @param {string} jid - O JID do contato.
     * @returns {Promise<object>} - Um objeto contendo as informações do contato.
     */
    async getMetadata(jid) {
        const contact = this.client.contacts.get(jid);
        if (contact) {
            return contact;
        }
        return await this.client.contacts.normalize({ key: { remoteJid: jid } });
    }

    /**
     * @param {string} id - O ID do contato.
     * @returns {Promise<object>} - Um objeto contendo as informações de recado do contato.
     */
    async getStatus(id) {
        const myStatus = await this.client.sock.fetchStatus(id);
        return myStatus;
    }

    /**
     * @param {string} lid - O LID do contato.
     * @returns {Promise<string>} - O JID do contato.
     */
    async getPnForLid(lid) {
        if (!lid.endsWith('@lid')) {
            throw new Error('LID inválido');
        }
        const jid = await this.client.sock.signalRepository.lidMapping.getPNForLID(lid);
        return jid?.replace(/:.*?@/, "@")
    }

    /**
     * @returns {Promise<object>} - Um objeto contendo as informações de recado do bot.
     */
    async getMyStatus() {
        const { id } = this.client.sock.user;
        const myStatus = await this.getStatus(id);
        return myStatus;
    }
    /**
     * @param {string} jid - O JID do contato.
     * @returns {Promise<object>} - Um objeto contendo as informações do contato.
     */
    async getBusinessProfile(jid) {
        this.client._validateConnection();
        return this.client.sock.getBusinessProfile(jid);
    }

    /** Obtém a URL da foto de perfil de um usuário ou grupo. */
    async getProfilePicture(jid) {
        this.client._validateConnection();
        return this.client.sock.profilePictureUrl(jid, 'image');
    }

    /** Verifica se um número está no WhatsApp. Inclusive retorna ID verdadeira para numeros brasileiros com 9 digitos */
    async isOnWhatsApp(number) {
        this.client._validateConnection();
        const [result] = await this.client.sock.onWhatsApp(number);
        return result;
    }

    /** Atualiza o nome do perfil do bot. */
    async updateProfileName(newName) {
        this.client._validateConnection();
        return this.client.sock.updateProfileName(newName);
    }

    /** Atualiza o recado/status do perfil do bot. */
    async updateProfileStatus(newStatus) {
        this.client._validateConnection();
        return this.client.sock.updateProfileStatus(newStatus);
    }

    /** Bloqueia um usuário. */
    async block(jid) {
        this.client._validateConnection();
        return this.client.sock.updateBlockStatus(jid, 'block');
    }

    /** Desbloqueia um usuário. */
    async unblock(jid) {
        this.client._validateConnection();
        return this.client.sock.updateBlockStatus(jid, 'unblock');
    }

    /** Obtém a lista de contatos bloqueados. */
    async getBlocklist() {
        this.client._validateConnection();
        return this.client.sock.fetchBlocklist();
    }

    /** Envia uma atualização de presença. Use PresenceStatus */
    async sendPresence(jid, presenceStatus) {
        this.client._validateConnection();
        await this.client.sock.sendPresenceUpdate(presenceStatus, jid);
    }

}

module.exports = { UserHandler, PresenceStatus };