const fs = require('fs');
const path = require('path');

class MessageStore {
    constructor(table) {
        this.table = table;
    }

    async saveMessage(chatId, message) {
        return await this.table.insert({ chat_id: chatId, key: message.id, from: message.from, to: message.to })
    }


    async getMessage(chatId, id) {
        return await this.table.select([{ chat_id: chatId }, 'AND', { mid: id }]);
    }

    async getMessages(chatId, { from, to, limit } = {}) {
        return await this.table.select([{ chat_id: chatId }, 'AND', { mid: id }]);

        let messages = this._loadMessages(chatId);

        if (from || to) {
            messages = messages.filter(msg => {
                const ts = new Date(msg.timestamp).getTime();
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
