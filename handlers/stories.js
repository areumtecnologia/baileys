// Classe para manipular envio e gerenciamento de stories seguindo padrao de handlers
const { Utils, MessageNormalizer } = require('../utils');

class StoriesHandler {
    constructor(client) {
        this.client = client;
    }

    async send(jids, content, options = { sendMentions: false }) {
        this.client._validateConnection();
        if (!Array.isArray(jids)) {
            throw new Error('jids must be an array of JIDs');
        }
        let result = null;
        if (options.sendMentions) {
            // Mesclar options ao content de um jeito pratico
            const contentFinal = { ...content, ...options };
            delete contentFinal.sendMentions;
            result = await this.client.sock.sendStatusMentions(contentFinal, jids);
        } else {
            result = await this.client.sock.sendMessage('status@broadcast', content, {
                broadcast: true,
                backgroundColor: options.backgroundColor || '#288d7c85',
                font: options.font || 1,
                statusJidList: jids
            });
        }

        return result;
    }

    // Remover uma mensagem de stories
    async delete(msg) {
        this.client._validateConnection();
        return await this.client.sock.sendMessage('status@broadcast', { delete: msg });
    }

}

module.exports = StoriesHandler;