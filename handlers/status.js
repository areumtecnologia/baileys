// Classe para manipular envio e gerenciamento de status seguindo padrao de handlers

class StatusHandler {
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
            // limitar o numero de jids do array até 5 por mensagem (limite imposto pelo WhatsApp)
            jids = jids.slice(0, 5);
            result = await this.client.sock.sendStatusMentions(content, jids, options);
        } else {
            result = await this.client.sock.sendMessage('status@broadcast', content, {
                broadcast: true,
                backgroundColor: options.backgroundColor || '#288d7c85',
                font: options.font || 1,
                statusJidList: jids
            });
        }
        return await this.client.messages.normalize(result);
    }

    // Remover uma mensagem de status
    async delete(msg) {
        this.client._validateConnection();
        return await this.client.sock.sendMessage('status@broadcast', { delete: msg });
    }

}

module.exports = StatusHandler;