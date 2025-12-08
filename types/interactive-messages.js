// File: lib/builders/interactive-message.js

/**
 * Classe base abstrata para todos os botões interativos.
 * @abstract
 */
class InteractiveButtonBase {
    constructor(name) {
        if (this.constructor === InteractiveButtonBase) {
            throw new Error("A classe base abstrata não pode ser instanciada diretamente.");
        }
        this.name = name;
    }

    /**
     * Formata o botão para o formato final esperado pela API.
     * @returns {{name: string, buttonParamsJson: string}}
     */
    toJSON() {
        const params = this._buildParams();
        return {
            name: this.name,
            buttonParamsJson: JSON.stringify(params)
        };
    }

    /**
     * Método a ser implementado pelas subclasses para construir seus parâmetros específicos.
     * @protected
     * @abstract
     */
    _buildParams() {
        throw new Error("O método '_buildParams' deve ser implementado pela subclasse.");
    }
}

// =================================================================================================
//                                     CLASSES DE BOTÕES SIMPLES
// =================================================================================================

class QuickReplyButton extends InteractiveButtonBase {
    /**
     * @param {string} id - O ID que será retornado quando o botão for clicado.
     * @param {string} displayText - O texto exibido no botão.
     */
    constructor(id, displayText) {
        super('quick_reply');
        this.id = id;
        this.displayText = displayText;
    }

    _buildParams() {
        return { display_text: this.displayText, id: this.id };
    }
}

class UrlButton extends InteractiveButtonBase {
    /**
     * @param {string} displayText - O texto exibido no botão.
     * @param {string} url - A URL para a qual o usuário será redirecionado.
     * @param {string} [merchantUrl] - URL do comerciante (opcional).
     */
    constructor(displayText, url, merchantUrl = null) {
        super('cta_url');
        this.displayText = displayText;
        this.url = url;
        this.merchantUrl = merchantUrl;
    }

    _buildParams() {
        const params = { display_text: this.displayText, url: this.url };
        if (this.merchantUrl) {
            params.merchant_url = this.merchantUrl;
        }
        return params;
    }
}

class CopyCodeButton extends InteractiveButtonBase {
    /**
     * @param {string} displayText - O texto exibido no botão.
     * @param {string} code - O código a ser copiado para a área de transferência.
     */
    constructor(displayText, code) {
        super('cta_copy');
        this.displayText = displayText;
        this.code = code;
    }

    _buildParams() {
        return { display_text: this.displayText, copy_code: this.code };
    }
}

class CallButton extends InteractiveButtonBase {
    /**
     * @param {string} displayText - O texto exibido no botão.
     * @param {string} phoneNumber - O número de telefone a ser chamado.
     */
    constructor(displayText, phoneNumber) {
        super('cta_call');
        this.displayText = displayText;
        this.phoneNumber = phoneNumber;
    }

    _buildParams() {
        return { display_text: this.displayText, phone_number: this.phoneNumber };
    }
}

class LocationButton extends InteractiveButtonBase {
    /**
     * @param {string} displayText - O texto exibido no botão.
     */
    constructor(displayText = 'Share Location') {
        super('send_location');
        this.displayText = displayText;
    }

    _buildParams() {
        return { display_text: this.displayText };
    }
}

// =================================================================================================
//                                CLASSES PARA BOTÃO DE LISTA (SINGLE_SELECT)
// =================================================================================================

class ListRow {
    /**
     * @param {string} id - O ID da linha, retornado na seleção.
     * @param {string} title - O título principal da linha.
     * @param {string} [description=''] - A descrição opcional abaixo do título.
     * @param {string} [header=''] - O cabeçalho opcional da linha.
     */
    constructor(id, title, description = '', header = '') {
        this.id = id;
        this.title = title;
        this.description = description;
        this.header = header;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            header: this.header
        };
    }
}

class ListSection {
    /**
     * @param {string} title - O título da seção.
     * @param {ListRow[]} [rows=[]] - Uma lista inicial de linhas.
     */
    constructor(title, rows = []) {
        this.title = title;
        this.rows = rows;
        this.highlightLabel = '';
    }

    /**
     * Adiciona uma linha à seção.
     * @param {ListRow} row - A linha a ser adicionada.
     * @returns {ListSection}
     */
    addRow(row) {
        this.rows.push(row);
        return this;
    }

    /**
     * Adiciona uma etiqueta de destaque à seção.
     * @param {string} label - O texto da etiqueta.
     * @returns {ListSection}
     */
    withHighlightLabel(label) {
        this.highlightLabel = label;
        return this;
    }

    toJSON() {
        return {
            title: this.title,
            highlight_label: this.highlightLabel,
            rows: this.rows.map(row => row.toJSON())
        };
    }
}

class ListButton extends InteractiveButtonBase {
    /**
     * @param {string} title - O título do menu da lista.
     * @param {ListSection[]} [sections=[]] - Uma lista inicial de seções.
     */
    constructor(title, sections = []) {
        super('single_select');
        this.title = title;
        this.sections = sections;
    }

    /**
     * Adiciona uma seção à lista.
     * @param {ListSection} section - A seção a ser adicionada.
     * @returns {ListButton}
     */
    addSection(section) {
        this.sections.push(section);
        return this;
    }

    _buildParams() {
        return {
            title: this.title,
            sections: this.sections.map(sec => sec.toJSON())
        };
    }
}

// =================================================================================================
//                                  CLASSE PRINCIPAL DO CONSTRUTOR
// =================================================================================================

/**
 * Construtor para mensagens interativas.
 */
class InteractiveMessage {
    constructor() {
        this.content = {
            text: '',
            title: '',
            subtitle: '',
            footer: '',
            interactiveButtons: []
        };
    }

    /**
     * Define o texto principal da mensagem.
     * @param {string} text 
     * @returns {InteractiveMessage}
     */
    withText(text) {
        this.content.text = text;
        return this;
    }

    /**
     * Define o título (cabeçalho) da mensagem.
     * @param {string} title 
     * @returns {InteractiveMessage}
     */
    withTitle(title) {
        this.content.title = title;
        return this;
    }

    /**
     * Define o subtítulo da mensagem.
     * @param {string} subtitle 
     * @returns {InteractiveMessage}
     */
    withSubtitle(subtitle) {
        this.content.subtitle = subtitle;
        return this;
    }

    /**
     * Define o rodapé da mensagem.
     * @param {string} footer 
     * @returns {InteractiveMessage}
     */
    withFooter(footer) {
        this.content.footer = footer;
        return this;
    }

    /**
     * Adiciona um botão à mensagem.
     * @param {InteractiveButtonBase} button - Uma instância de uma classe de botão (ex: QuickReplyButton).
     * @returns {InteractiveMessage}
     */
    addButton(button) {
        if (!(button instanceof InteractiveButtonBase)) {
            throw new Error('O botão deve ser uma instância de uma classe que herda de InteractiveButtonBase.');
        }
        this.content.interactiveButtons.push(button.toJSON());
        return this;
    }

    /**
     * Constrói e retorna o objeto final da mensagem interativa.
     * @returns {object}
     */
    build() {
        // Remove chaves vazias para um payload mais limpo
        Object.keys(this.content).forEach(key => {
            if (!this.content[key] || (Array.isArray(this.content[key]) && this.content[key].length === 0)) {
                delete this.content[key];
            }
        });
        return this.content;
    }
}

module.exports = {
    InteractiveMessage,
    QuickReplyButton,
    UrlButton,
    CopyCodeButton,
    CallButton,
    LocationButton,
    ListButton,
    ListSection,
    ListRow
};