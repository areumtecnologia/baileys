
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
    }

    /** Obtém os metadados de um grupo. */
    async getMetadata(groupId) {
        this.client._validateConnection();
        return this.client.sock.groupMetadata(groupId);
    }

    /** Cria um novo grupo. */
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

    /** Modifica a lista de participantes de um grupo. */
    async updateParticipants(groupId, participantsJids, action) {
        this.client._validateConnection();
        return this.client.sock.groupParticipantsUpdate(groupId, participantsJids, action);
    }

    /** Obtém o código de convite de um grupo. */
    async getInviteCode(groupId) {
        this.client._validateConnection();
        return this.client.sock.groupInviteCode(groupId);
    }
}

module.exports = GroupHandler;