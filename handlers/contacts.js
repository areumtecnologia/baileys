// Criar um store de contatos

class ContactHandler {
    constructor(client) {
        this.client = client;
        this.contacts = new Map();
    }

    /**
     * @param {string} jid - O JID do contato.
     * @param {object} contact - O contato a ser setado.
     * @param {string} contact.name - O nome do contato.
     * @param {string} contact.id - O ID do contato.
     * @param {string} contact.lid - O LID do contato.
     * @param {string} contact.slogan - O slogan do contato.
     * @param {string} contact.type - O type do contato: 'personal, business, group, broadcast, newsletter'.
     * @param {object} contact.metadata - Os metadados do contato.
     */
    async set(jid, contact) {
        this.contacts.set(jid, contact);
    }

    /**
     * @param {import('baileys').proto.WebMessageInfo} message - O objeto de mensagem bruto.
     * @returns {object} Um objeto contendo as informações do contato.
     */
    async normalize(message) {

        const fromMe = message.key.fromMe;
        const clientLid = this.client.sock.user.lid.replace(/:.*?@/, "@");
        const clientJid = this.client.jidNormalizedUser(this.client.sock.user.id);
        const chatLid = [message.key.remoteJid, message.key.remoteJidAlt].find(jid => jid && jid.includes('@lid'))?.replace(/:.*?@/, "@");
        const chatId = [message.key.remoteJid, message.key.remoteJidAlt].find(jid => jid && !jid.includes('@lid'))?.replace(/:.*?@/, "@");
        const isUser = chatId?.endsWith('@s.whatsapp.net');
        const isGroup = chatId?.endsWith('@g.us');
        const isNewsletter = chatId?.includes('@newsletter');
        const userBusinessMetadata = isUser ? await this.client.users.getBusinessProfile(chatId) : null;
        const isBusiness = !!userBusinessMetadata;
        const newsletterMetadata = isNewsletter ? await this.client.newsletters.getMetadata(chatId) : null;
        const groupMetadata = isGroup ? await this.client.groups.getMetadata(chatId) : null;
        const slogan = await this.client.users.getStatus(chatId);
        const picture = await this.client.users.getProfilePicture(chatId);
        const description = isNewsletter ? newsletterMetadata?.thread_metadata?.description?.text : isGroup ? groupMetadata?.description : isBusiness ? userBusinessMetadata?.description : null;
        const from = fromMe ? clientJid : chatId;
        const to = fromMe ? chatId : clientJid;
        const contact = {
            id: chatId,
            lid: from == to ? clientLid : chatLid,
            name: isNewsletter ? newsletterMetadata?.thread_metadata?.name?.text : isGroup ? groupMetadata?.subject : fromMe ? this.client.sock.user.name : message.pushName,
            type: isNewsletter ? "newsletter" : isGroup ? "group" : isBusiness ? "business" : "personal",
            metadata: isNewsletter ? newsletterMetadata : isGroup ? groupMetadata : isBusiness ? userBusinessMetadata : { wid: chatId, lid: chatLid, name: message.pushName, type: "personal" },
        };
        if (isGroup) {
            contact.isGroup = true;
        }
        if (isNewsletter) {
            contact.isNewsletter = true;
        }
        if (isBusiness) {
            contact.isBusiness = true;
            contact.metadata = userBusinessMetadata;
        }
        if (slogan) {
            contact.slogan = slogan[0]?.status;
        }
        if (description) {
            contact.description = description;
        }
        if (picture) {
            contact.picture = picture;
        }
        // retorna o contato
        return contact;
    }

    /**
     * @param {string} jid - O JID do contato.
     * @returns {Promise<object>} - Um objeto contendo as informações do contato.
     */
    async get(jid) {
        let j = jid;
        if (jid.endsWith('@lid')) {
            j = await this.client.users.getPnForLid(jid);
        }
        if (this.contacts.has(j)) {
            return this.contacts.get(j);
        }
        return null;
    }

    /**
     * @returns {Promise<Array<object>>} - Um array contendo as informações de todos os contatos.
     */
    async getAll() {
        return Array.from(this.contacts.values());
    }

}

module.exports = ContactHandler;

