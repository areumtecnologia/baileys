class MessageStore {
    constructor(table) {
        this.table = table;
    }

    async saveMessage(chatId, message) {
        return await this.table.insert({
            chat_id: chatId,
            key: message.id,
            from: message.from,
            to: message.to
        });
    }

    async getMessage(chatId, id) {
        // Tenta buscar no banco de dados com base no chat_id e mid/key
        const results = await this.table.select([{ chat_id: chatId }, 'AND', { key: id }]);
        return results && results.length > 0 ? results[0] : null;
    }

    async getMessages(chatId, { from, to, limit } = {}) {
        // Consulta mensagens associadas ao chat_id no banco
        let messages = await this.table.select([{ chat_id: chatId }]);
        if (!messages) {
            return [];
        }

        if (from || to) {
            messages = messages.filter(msg => {
                const timestamp = msg.timestamp || msg.created_at || msg.raw?.messageTimestamp;
                if (!timestamp) return true;
                const ts = new Date(timestamp).getTime();
                return (!from || ts >= new Date(from).getTime()) &&
                    (!to || ts <= new Date(to).getTime());
            });
        }

        if (limit) {
            messages = messages.slice(-limit);
        }

        return messages;
    }
}

module.exports = MessageStore;
