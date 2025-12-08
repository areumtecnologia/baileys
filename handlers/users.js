
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

    async getStatus(id) {
        const myStatus = await this.client.sock.fetchStatus(id);
        return myStatus;
    }

    async getMyStatus() {
        const { id } = this.client.sock.user;
        const myStatus = await this.getStatus(id);
        return myStatus;
    }

    /** Obtém a URL da foto de perfil de um usuário ou grupo. */
    async getProfilePicture(jid) {
        this.client._validateConnection();
        return this.client.sock.profilePictureUrl(jid, 'image');
    }

    /** Verifica se um número está no WhatsApp. Inclusive retorna ID verdadeira para numeros brasileiros com 9 digitos */
    async isOnWhatsApp(numbers) {
        this.client._validateConnection();

        // Se for apenas 1 número
        if (!Array.isArray(numbers)) {
            const [result] = await this.client.sock.onWhatsApp(numbers);
            return result;
        }

        // Se for lista de números
        const results = await this.client.sock.onWhatsApp(...numbers);
        return results;
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