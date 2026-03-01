
/**
 * Manipula operações relacionadas a grupos.
 * 
 * @copyright Áreum Tecnologia
 * @author Áreum Tecnologia
 * @class GroupHandler
 * @param {import('../client').default} client - A instância principal do cliente.
 * 
 * @method getMetadata Obtém os metadados de um grupo.
 * @param {string} groupId - O ID do grupo.
 * @returns {Promise<Object>} Metadados do grupo.
 * 
 * @method create Cria um novo grupo.
 * @param {string} subject - Nome do grupo.
 * @param {string[]} participantsJids - Lista de JIDs dos participantes.
 * @returns {Promise<Object>} Dados do grupo criado.
 * 
 * @method leave Deixa um grupo.
 * @param {string} groupId - O ID do grupo.
 * @returns {Promise<Object>} Resultado da operação.
 * 
 * @method updateName Atualiza o nome de um grupo.
 * @param {string} groupId - O ID do grupo.
 * @param {string} newName - Novo nome do grupo.
 * @returns {Promise<Object>} Resultado da operação.
 * 
 * @method updateDescription Atualiza a descrição de um grupo.
 * @param {string} groupId - O ID do grupo.
 * @param {string} newDescription - Nova descrição do grupo.
 * @returns {Promise<Object>} Resultado da operação.
 * 
 * @method updateParticipants Modifica a lista de participantes de um grupo.
 * @param {string} groupId - O ID do grupo.
 * @param {string[]} participantsJids - Lista de JIDs dos participantes.
 * @param {'add'|'remove'} action - Ação a ser realizada.
 * @returns {Promise<Object>} Resultado da operação.
 * 
 * @method getInviteCode Obtém o código de convite de um grupo.
 * @param {string} groupId - O ID do grupo.
 * @returns {Promise<string>} Código de convite do grupo.
 */
class GroupHandler {
    /**
     * @param {import('../client').default} client - A instância principal do cliente.
     */
    constructor(client) {
        this.client = client;
        this.store = new Map();
    }

    /** Obtém os metadados de um grupo a partir da jid do grupo. 
     * @param {string} groupId - O ID do grupo.
     * @returns {Promise<Object>} Metadados do grupo. Objeto de retorno:
     * 
     * { id: 'string', subject: 'string', participants: [{ id: 'string', admin: boolean }], owner: 'string', creation: number, ephemeralDuration: number, settings: Object, desc: string, descId: string, descOwner: string, descTime: number, restrict: boolean, announce: boolean, memberAddMode: string, memberRemoveMode: string, ... }
    */
    async getMetadata(groupId) {
        this.client._validateConnection();
        if (!groupId.endsWith('@g.us')) {
            return { error: new Error('Invalid group ID') };
        }
        if (this.store.has(groupId)) {
            return this.store.get(groupId);
        }
        const groupMetadata = await this.client.sock.groupMetadata(groupId);
        this.store.set(groupId, groupMetadata);
        return groupMetadata;
    }
    /** Obtém todos os grupos que o cliente participa. */
    async getAllGroups() {
        this.client._validateConnection();
        const groups = await this.client.sock.groupFetchAllParticipating();
        if (!groups) {
            return [];
        }
        if (groups.error) {
            return { error: groups.error };
        }
        // add groups to this.store
        Object.values(groups).forEach((group) => {
            this.store.set(group.id, group);
        });

        // convert groups to array
        return Object.values(groups);
    }
    /** Obtém a URL da foto de perfil de um usuário ou grupo. */
    async getProfilePicture(jid) {
        this.client._validateConnection();
        return this.client.sock.profilePictureUrl(jid, 'image');
    }

    /** Cria um novo grupo a partir de uma lista de jids. */
    async create(subject, participantsJids) {
        this.client._validateConnection();
        return this.client.sock.groupCreate(subject, participantsJids);
    }

    /** Deixa um grupo. */
    async leave(groupId) {
        this.client._validateConnection();
        return this.client.sock.groupLeave(groupId);
    }

    /** Atualiza o nome de um grupo. */
    async updateName(groupId, newName) {
        this.client._validateConnection();
        return this.client.sock.groupUpdateSubject(groupId, newName);
    }

    /** Atualiza a descrição de um grupo. */
    async updateDescription(groupId, newDescription) {
        this.client._validateConnection();
        return this.client.sock.groupUpdateDescription(groupId, newDescription);
    }

    /**
     * Adiciona, remove ou promove participantes de um grupo.
     * @param {string} groupId - O ID do grupo.
     * @param {string[]} participantsJids - Lista de JIDs dos participantes.
     * @param {'add'|'remove'} action - A ação a ser realizada.
     * @returns {Promise<Object>} Resultado da operação.
     */
    async updateParticipants(groupId, participantsJids, action) {
        this.client._validateConnection();
        return this.client.sock.groupParticipantsUpdate(groupId, participantsJids, action);
    }

    /**
     * Remove participantes de um grupo.
     * @param {string} groupId - O ID do grupo.
     * @param {string[]} participantsJids - Lista de JIDs dos participantes.
     * @returns {Promise<Object>} Resultado da operação.
     */
    async removeParticipants(groupId, participantsJids) {
        this.client._validateConnection();
        return this.client.sock.groupParticipantsUpdate(groupId, participantsJids, 'remove');
    }

    /**
     * Adiciona participantes a um grupo.
     * @param {string} groupId - O ID do grupo.
     * @param {string[]} participantsJids - Lista de JIDs dos participantes.
     * @returns {Promise<Object>} Resultado da operação.
     */
    async addParticipants(groupId, participantsJids) {
        this.client._validateConnection();
        return this.client.sock.groupParticipantsUpdate(groupId, participantsJids, 'add');
    }

    /**
     * Promove participantes de um grupo.
     * @param {string} groupId - O ID do grupo.
     * @param {string[]} participantsJids - Lista de JIDs dos participantes.
     * @returns {Promise<Object>} Resultado da operação.
     */
    async promoteParticipants(groupId, participantsJids) {
        this.client._validateConnection();
        return this.client.sock.groupParticipantsUpdate(groupId, participantsJids, 'promote');
    }

    /**
     * Rebaixa participantes de um grupo.
     * @param {string} groupId - O ID do grupo.
     * @param {string[]} participantsJids - Lista de JIDs dos participantes.
     * @returns {Promise<Object>} Resultado da operação.
     */
    async demoteParticipants(groupId, participantsJids) {
        this.client._validateConnection();
        return this.client.sock.groupParticipantsUpdate(groupId, participantsJids, 'demote');
    }

    /**
     * Obtém o código de convite de um grupo.
     * @param {string} groupId - O ID do grupo.
     * @returns {Promise<string>} Código de convite do grupo.
     */
    async getInviteCode(groupId) {
        this.client._validateConnection();
        return this.client.sock.groupInviteCode(groupId);
    }

    /**
     * Revoga o código de convite de um grupo.
     * @param {string} groupId - O ID do grupo.
     * @returns {Promise<string>} Código de convite do grupo.
     */
    async revokeInviteCode(groupId) {
        this.client._validateConnection();
        return this.client.sock.groupRevokeInvite(groupId);
    }
}

module.exports = GroupHandler;