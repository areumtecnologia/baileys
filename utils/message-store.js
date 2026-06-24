const fs = require('fs/promises');
const { existsSync } = require('fs');
const path = require('path');

class MessageStore {
    constructor(basePath) {
        this.basePath = path.join(basePath, 'message_store');
        if (!existsSync(this.basePath)) {
            const fsSync = require('fs');
            fsSync.mkdirSync(this.basePath, { recursive: true });
        }
    }

    _getFilePath(chatId) {
        return path.join(this.basePath, `${chatId}.json`);
    }

    async _loadMessages(chatId) {
        const filePath = this._getFilePath(chatId);
        try {
            await fs.access(filePath);
        } catch {
            return [];
        }
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data) || [];
        } catch (err) {
            // Em caso de JSON corrompido, retorna lista vazia
            return [];
        }
    }

    async _saveMessages(chatId, messages) {
        const filePath = this._getFilePath(chatId);
        await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
    }

    async saveMessage(chatId, message) {
        const messages = await this._loadMessages(chatId);

        // Evita duplicados pelo id
        if (!messages.find(m => m.id === message.id)) {
            messages.push(message);
            await this._saveMessages(chatId, messages);
        }
    }

    async getMessage(chatId, id) {
        const messages = await this._loadMessages(chatId);
        return messages.find(m => m.id === id);
    }

    async getMessages(chatId, { from, to, limit } = {}) {
        let messages = await this._loadMessages(chatId);

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
