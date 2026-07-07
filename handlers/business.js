/**
 * @copyright Áreum Tecnologia
 * @author Áreum Tecnologia
 * @license Proprietary
 * 
 * Manipula as operações de WhatsApp Business (Perfil Comercial, Capa, Catálogo, Produtos e Pedidos).
 * 
 * @class BusinessHandler
 * @classdesc Handler para gerenciamento comercial da conta do bot e interações comerciais.
 */
class BusinessHandler {
    /**
     * @param {import('../index').UnityChat} client - A instância principal do cliente UnityChat.
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * Atualiza o perfil comercial da conta.
     * @param {object} profile - Objeto contendo os dados do perfil comercial.
     * @param {string} [profile.address] - Endereço físico.
     * @param {string} [profile.email] - Endereço de e-mail.
     * @param {string} [profile.description] - Descrição comercial.
     * @param {string[]} [profile.websites] - Lista de URLs do site.
     * @param {object} [profile.hours] - Horário de funcionamento estruturado.
     * @returns {Promise<object>} O resultado da operação.
     */
    async updateBusinessProfile(profile) {
        this.client._validateConnection();
        try {
            return await this.client.sock.updateBussinesProfile(profile);
        } catch (error) {
            this.client.logger.error({ profile, err: error.message }, 'Erro ao atualizar perfil comercial');
            throw new Error(`Erro ao atualizar perfil comercial: ${error.message}`, { cause: error });
        }
    }

    /**
     * Alias para updateBusinessProfile (mantendo a compatibilidade com a escrita da biblioteca base).
     */
    async updateBussinesProfile(profile) {
        return this.updateBusinessProfile(profile);
    }

    /**
     * Atualiza ou define a foto de capa comercial da conta.
     * @param {string|Buffer} path - Caminho do arquivo ou Buffer da imagem.
     * @returns {Promise<string>} O ID da foto de capa configurada.
     */
    async updateCoverPhoto(path) {
        this.client._validateConnection();
        try {
            return await this.client.sock.updateCoverPhoto(path);
        } catch (error) {
            this.client.logger.error({ path, err: error.message }, 'Erro ao atualizar foto de capa');
            throw new Error(`Erro ao atualizar foto de capa: ${error.message}`, { cause: error });
        }
    }

    /**
     * Remove a foto de capa comercial ativa.
     * @param {string} coverPhotoId - O ID da foto de capa obtido anteriormente.
     * @returns {Promise<object>} O resultado da operação.
     */
    async removeCoverPhoto(coverPhotoId) {
        this.client._validateConnection();
        try {
            return await this.client.sock.removeCoverPhoto(coverPhotoId);
        } catch (error) {
            this.client.logger.error({ coverPhotoId, err: error.message }, 'Erro ao remover foto de capa');
            throw new Error(`Erro ao remover foto de capa: ${error.message}`, { cause: error });
        }
    }

    /**
     * Obtém a lista de produtos do catálogo de um contato ou da própria conta comercial.
     * @param {object} options - Opções de busca do catálogo.
     * @param {string} options.jid - JID do contato/empresa comercial.
     * @param {number} [options.limit=15] - Limite de produtos.
     * @returns {Promise<object>} Objeto contendo os produtos.
     */
    async getCatalog(options) {
        this.client._validateConnection();
        try {
            return await this.client.sock.getCatalog(options);
        } catch (error) {
            this.client.logger.error({ options, err: error.message }, 'Erro ao buscar catálogo');
            throw new Error(`Erro ao buscar catálogo: ${error.message}`, { cause: error });
        }
    }

    /**
     * Obtém as coleções de produtos organizadas do catálogo de um contato.
     * @param {string} jid - JID da empresa comercial.
     * @param {number} [count=10] - Quantidade máxima de coleções.
     * @returns {Promise<object>} Objeto contendo as coleções.
     */
    async getCollections(jid, count = 10) {
        this.client._validateConnection();
        try {
            return await this.client.sock.getCollections(jid, count);
        } catch (error) {
            this.client.logger.error({ jid, count, err: error.message }, 'Erro ao buscar coleções');
            throw new Error(`Erro ao buscar coleções: ${error.message}`, { cause: error });
        }
    }

    /**
     * Obtém os detalhes completos de um pedido comercial.
     * @param {string} orderId - O ID do pedido (exibido na mensagem do carrinho).
     * @param {string} orderToken - O token do pedido correspondente.
     * @returns {Promise<object>} Detalhes estruturados do pedido comercial.
     */
    async getOrderDetails(orderId, orderToken) {
        this.client._validateConnection();
        try {
            return await this.client.sock.getOrderDetails(orderId, orderToken);
        } catch (error) {
            this.client.logger.error({ orderId, orderToken, err: error.message }, 'Erro ao buscar detalhes do pedido');
            throw new Error(`Erro ao buscar detalhes do pedido: ${error.message}`, { cause: error });
        }
    }

    /**
     * Adiciona um novo produto ao catálogo.
     * @param {object} product - Dados do produto a ser cadastrado.
     * @param {string} product.name - Nome do produto.
     * @param {string} [product.description] - Descrição do produto.
     * @param {number} [product.price] - Preço do produto multiplicado por 100 (ex: 4990 para R$ 49,90).
     * @param {string} [product.currency='BRL'] - Moeda.
     * @param {boolean} [product.isHidden=false] - Se o produto ficará oculto.
     * @param {string|Buffer|object} [product.image] - Imagem associada (URL ou Buffer ou Objeto de mídia).
     * @returns {Promise<object>} Informações do produto criado.
     */
    async productCreate(product) {
        this.client._validateConnection();
        try {
            return await this.client.sock.productCreate(product);
        } catch (error) {
            this.client.logger.error({ product, err: error.message }, 'Erro ao criar produto');
            throw new Error(`Erro ao criar produto: ${error.message}`, { cause: error });
        }
    }

    /**
     * Atualiza dados de um produto existente no catálogo.
     * @param {string} productId - O ID do produto.
     * @param {object} product - Novos dados do produto.
     * @returns {Promise<object>} Informações do produto atualizado.
     */
    async productUpdate(productId, product) {
        this.client._validateConnection();
        try {
            return await this.client.sock.productUpdate(productId, product);
        } catch (error) {
            this.client.logger.error({ productId, product, err: error.message }, 'Erro ao atualizar produto');
            throw new Error(`Erro ao atualizar produto: ${error.message}`, { cause: error });
        }
    }

    /**
     * Remove produtos do catálogo definitivamente.
     * @param {string[]} productIds - Array contendo os IDs dos produtos a serem deletados.
     * @returns {Promise<object>} O resultado da operação.
     */
    async productDelete(productIds) {
        this.client._validateConnection();
        if (!Array.isArray(productIds)) {
            throw new Error('productIds deve ser um array de IDs de produtos');
        }
        try {
            return await this.client.sock.productDelete(productIds);
        } catch (error) {
            this.client.logger.error({ productIds, err: error.message }, 'Erro ao deletar produtos');
            throw new Error(`Erro ao deletar produtos: ${error.message}`, { cause: error });
        }
    }
}

module.exports = BusinessHandler;
