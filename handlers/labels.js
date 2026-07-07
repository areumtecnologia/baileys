/**
 * @copyright Áreum Tecnologia
 * @author Áreum Tecnologia
 * @license Proprietary
 * 
 * Manipula as etiquetas (labels) do WhatsApp Business.
 * 
 * @class LabelsHandler
 * @classdesc Handler para criação, edição, deleção e associação de etiquetas do WhatsApp Business.
 */
class LabelsHandler {
    /**
     * @param {import('../index').UnityChat} client - A instância principal do cliente UnityChat.
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * Cria uma nova etiqueta de negócio.
     * @param {string} name - O nome da etiqueta.
     * @param {number} color - O ID da cor da etiqueta (0 a 19).
     * @returns {Promise<object>} O resultado da criação.
     */
    async createLabel(name, color) {
        this.client._validateConnection();
        try {
            return await this.client.sock.createLabel(name, color);
        } catch (error) {
            this.client.logger.error({ name, color, err: error.message }, 'Erro ao criar etiqueta');
            throw new Error(`Erro ao criar etiqueta: ${error.message}`, { cause: error });
        }
    }

    /**
     * Atualiza uma etiqueta de negócio existente.
     * @param {string} id - O ID da etiqueta.
     * @param {string} name - O novo nome da etiqueta.
     * @param {number} color - O ID da nova cor da etiqueta (0 a 19).
     * @returns {Promise<object>} O resultado da atualização.
     */
    async updateLabel(id, name, color) {
        this.client._validateConnection();
        try {
            return await this.client.sock.updateLabel(id, name, color);
        } catch (error) {
            this.client.logger.error({ id, name, color, err: error.message }, 'Erro ao atualizar etiqueta');
            throw new Error(`Erro ao atualizar etiqueta: ${error.message}`, { cause: error });
        }
    }

    /**
     * Exclui definitivamente uma etiqueta de negócio da conta.
     * @param {string} id - O ID da etiqueta a ser excluída.
     * @returns {Promise<object>} O resultado da exclusão.
     */
    async deleteLabel(id) {
        this.client._validateConnection();
        try {
            return await this.client.sock.deleteLabel(id);
        } catch (error) {
            this.client.logger.error({ id, err: error.message }, 'Erro ao deletar etiqueta');
            throw new Error(`Erro ao deletar etiqueta: ${error.message}`, { cause: error });
        }
    }

    /**
     * Associa uma etiqueta a uma conversa (JID).
     * @param {string} jid - O JID da conversa.
     * @param {string} labelId - O ID da etiqueta.
     * @returns {Promise<object>} O resultado da associação.
     */
    async addChatLabel(jid, labelId) {
        this.client._validateConnection();
        try {
            return await this.client.sock.addChatLabel(jid, labelId);
        } catch (error) {
            this.client.logger.error({ jid, labelId, err: error.message }, 'Erro ao associar etiqueta ao chat');
            throw new Error(`Erro ao associar etiqueta ao chat: ${error.message}`, { cause: error });
        }
    }

    /**
     * Remove uma etiqueta de uma conversa (JID).
     * @param {string} jid - O JID da conversa.
     * @param {string} labelId - O ID da etiqueta.
     * @returns {Promise<object>} O resultado da operação.
     */
    async removeChatLabel(jid, labelId) {
        this.client._validateConnection();
        try {
            return await this.client.sock.removeChatLabel(jid, labelId);
        } catch (error) {
            this.client.logger.error({ jid, labelId, err: error.message }, 'Erro ao remover etiqueta do chat');
            throw new Error(`Erro ao remover etiqueta do chat: ${error.message}`, { cause: error });
        }
    }

    /**
     * Associa uma etiqueta a uma mensagem específica.
     * @param {string} jid - O JID da conversa que contém a mensagem.
     * @param {string} msgId - O ID da mensagem.
     * @param {string} labelId - O ID da etiqueta.
     * @returns {Promise<object>} O resultado da associação.
     */
    async addMessageLabel(jid, msgId, labelId) {
        this.client._validateConnection();
        try {
            return await this.client.sock.addMessageLabel(jid, msgId, labelId);
        } catch (error) {
            this.client.logger.error({ jid, msgId, labelId, err: error.message }, 'Erro ao associar etiqueta à mensagem');
            throw new Error(`Erro ao associar etiqueta à mensagem: ${error.message}`, { cause: error });
        }
    }

    /**
     * Remove uma etiqueta de uma mensagem específica.
     * @param {string} jid - O JID da conversa que contém a mensagem.
     * @param {string} msgId - O ID da mensagem.
     * @param {string} labelId - O ID da etiqueta.
     * @returns {Promise<object>} O resultado da operação.
     */
    async removeMessageLabel(jid, msgId, labelId) {
        this.client._validateConnection();
        try {
            return await this.client.sock.removeMessageLabel(jid, msgId, labelId);
        } catch (error) {
            this.client.logger.error({ jid, msgId, labelId, err: error.message }, 'Erro ao remover etiqueta da mensagem');
            throw new Error(`Erro ao remover etiqueta da mensagem: ${error.message}`, { cause: error });
        }
    }
}

module.exports = LabelsHandler;
