// Classe única para construir uma mensagem com múltiplos botões de diferentes tipos, sem método build
class MessageButton {
    constructor({ title = '', text = '', footer = '' } = {}) {
        this.title = title;
        this.text = text;
        this.footer = footer;
        this.buttons = [];
    }

    // Adiciona um botão de resposta rápida
    addQuickReply(id, text) {
        this.buttons.push({ id, text });
        return this;
    }

    // Adiciona um botão de URL
    addUrlButton(display_text, url) {
        this.buttons.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({ display_text, url })
        });
        return this;
    }

    // Adiciona um botão de copiar código
    addCopyCodeButton(display_text, code) {
        this.buttons.push({
            name: 'copy_code',
            buttonParamsJson: JSON.stringify({ display_text, code })
        });
        return this;
    }

    // Adiciona um botão de chamada telefônica
    addCallButton(display_text, phone_number) {
        this.buttons.push({
            name: 'call',
            buttonParamsJson: JSON.stringify({ display_text, phone_number })
        });
        return this;
    }

    // Permite usar o objeto diretamente
    toJSON() {
        return {
            title: this.title,
            text: this.text,
            footer: this.footer,
            buttons: this.buttons
        };
    }
}

module.exports = { MessageButton };

/*
Exemplo de uso:

const { MessageButton } = require('./buttons');

const msg = new MessageButton({
    title: 'Header Title',
    text: 'Pick one option below',
    footer: 'Footer text'
})
    .addQuickReply('quick_1', 'Quick Reply')
    .addUrlButton('Open Site', 'https://example.com')
    .addCopyCodeButton('Copy Code', '123456')
    .addCallButton('Call Us', '+5511999999999');

await sendButtons(this.sock, jid, msg); // msg será convertido automaticamente
*/
