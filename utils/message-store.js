const fs = require('fs');
const path = require('path');

class MessageStore {
    constructor(basePath) {
        this.basePath = path.join(basePath, 'message_store');
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }
    }

    _getFilePath(chatId) {
        return path.join(this.basePath, `${chatId}.json`);
    }

    _loadMessages(chatId) {
        const filePath = this._getFilePath(chatId);
        if (!fs.existsSync(filePath)) return [];
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
        } catch (err) {
            console.error("Erro ao ler mensagens:", err);
            return [];
        }
    }

    _saveMessages(chatId, messages) {
        const filePath = this._getFilePath(chatId);
        fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    }

    saveMessage(chatId, message) {
        const messages = this._loadMessages(chatId);

        // Evita duplicados pelo id
        if (!messages.find(m => m.id === message.id)) {
            messages.push(message);
            this._saveMessages(chatId, messages);
        }
    }


    getMessage(chatId, id) {
        const messages = this._loadMessages(chatId);
        return messages.find(m => m.id === id);
    }

    getMessages(chatId, { from, to, limit } = {}) {
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
