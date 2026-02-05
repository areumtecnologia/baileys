const digestSync = require('crypto-digest-sync');
/**
 * Classe utilitária estática para normalizar o objeto de mensagem do Baileys
 * em uma estrutura rica, consistente e completa. (Versão 3 - Final)
 */
class MessageNormalizer {
    /**
     * Ponto de entrada principal. Normaliza uma mensagem bruta do Baileys.
     * @param {import('../handlers/contacts').default} contact - O contato.
     * @param {import('baileys').proto.WebMessageInfo} rawMessage - O objeto de mensagem bruto.
     * @param {import('../client').default} client - A instância do cliente.
     * @returns {object|null} Um objeto de mensagem normalizado ou null se não for uma mensagem válida.
     */
    static async normalize(contact, rawMessage, client) {
        // if (!rawMessage || (!rawMessage.message && !rawMessage.messageStubType)) {
        if (!rawMessage || !rawMessage.message) {
            return null;
        }

        // Caso especial 1: Mensagem editada. A normalização é feita na mensagem interna.
        const editedMsgContent = rawMessage.message?.protocolMessage?.editedMessage;
        if (editedMsgContent) {
            const originalKey = rawMessage.message.protocolMessage.key;
            const normalizedEdit = this.normalize({ key: originalKey, message: editedMsgContent, pushName: rawMessage.pushName }, client);
            if (normalizedEdit) {
                normalizedEdit.isEdited = true;
                normalizedEdit.id = originalKey.id; // Garante que o ID é o da mensagem original
            }
            return normalizedEdit;
        }
        const originalType = Object.keys(rawMessage.message)[0];
        const type = this._getFriendlyType(rawMessage.message);
        const messageContent = rawMessage.message[originalType];
        const contextInfo = messageContent?.contextInfo || rawMessage.message?.messageContextInfo;
        const clientJid = client.jidNormalizedUser(client.sock.user.id);
        const fromMe = rawMessage.key.fromMe;
        const from = fromMe ? clientJid : contact.id;
        const to = fromMe ? contact.id : clientJid;

        const normalized = {
            id: rawMessage.key.id,
            chat: contact,
            fromMe,
            from,
            fromPushName: fromMe ? client.user.name : contact.name,
            to,
            type,
            body: this._extractBody(rawMessage.message),
            hasMedia: false,
            media: null,
            location: null,
            contacts: this._extractContacts(rawMessage.message),
            isReply: !!contextInfo?.quotedMessage,
            quotedMessage: null,
            isForwarded: !!contextInfo?.isForwarded,
            forwardingScore: contextInfo?.forwardingScore || 0,
            mentions: contextInfo?.mentionedJid || [],
            isMentioningMe: (contextInfo?.mentionedJid || []).includes(clientJid),
            isEdited: false,
            interactiveReply: this._extractInteractiveReply(rawMessage.message),
            reaction: this._extractReaction(rawMessage.message),
            pollUpdate: await this._extractPollUpdate(rawMessage, client),
            poll: this._extractPollCreation(rawMessage),
            timestamp: new Date(Number(rawMessage.messageTimestamp) * 1000),
            raw: rawMessage // Referência ao objeto original para acesso avançado
        };

        // Preenche os campos de mídia e localização com detalhes específicos
        this._enrichWithTypedData(normalized, rawMessage, client);

        // Se for uma resposta, normaliza a mensagem citada recursivamente
        if (normalized.isReply) {
            const quotedRaw = {
                key: {
                    remoteJid: normalized.chat.id,
                    id: contextInfo.stanzaId,
                    fromMe: client.jidNormalizedUser(contextInfo.participant) === clientJid,
                    participant: contextInfo.participant
                },
                message: contextInfo.quotedMessage
            };
            normalized.quotedMessage = this.normalize(quotedRaw, client);
        }


        return normalized;
    }

    /** @private Retorna um tipo amigável baseado no conteúdo da mensagem. */
    static _getFriendlyType(message) {
        if (!message) return 'unknown'

        if (message.conversation || message.extendedTextMessage) return 'text';
        if (message.imageMessage) return 'image';
        if (message.albumMessage) return 'album';
        if (message.videoMessage || message.associatedChildMessage?.message?.videoMessage) return 'video';
        if (message.audioMessage) return 'audio';
        if (message.documentMessage) return 'document';
        if (message.documentWithCaptionMessage) return 'document';
        if (message.stickerMessage) return 'sticker';
        if (message.locationMessage) return 'location';
        if (message.contactMessage || message.contactsArrayMessage) return 'contact';
        if (message.buttonsResponseMessage || message.listResponseMessage) return 'interactive_reply';
        if (message.reactionMessage) return 'reaction';
        if (message.pollCreationMessage || message.pollCreationMessageV3) return 'poll_creation';
        if (message.pollUpdateMessage) return 'poll_update';
        if (message.templateButtonReplyMessage) return 'template_button_reply';
        if (message.pinInChatMessage) return 'pin_in_chat';
        if (message.unpinInChatMessage) return 'unpin_in_chat';
        if (message.questionReplyMessage) return 'question_reply';
        // Detectar o tipo de interactiveButtons pela propriedade name, se interactive buttons tiver apenas um botão
        if (message.interactiveMessage && message.interactiveMessage.interactiveButtons && message.interactiveMessage.interactiveButtons[0].name === 'review_and_pay') return 'review_and_pay';
        if (message.interactiveMessage && message.interactiveMessage.interactiveButtons && message.interactiveMessage.interactiveButtons[0].name === 'review_order') return 'review_order';
        if (message.interactiveMessage && message.interactiveMessage.interactiveButtons && message.interactiveMessage.interactiveButtons[0].name === 'quick_reply') return 'quick_reply';
        if (message.interactiveMessage && message.interactiveMessage.interactiveButtons && message.interactiveMessage.interactiveButtons[0].name === 'cta_url') return 'cta_url';
        if (message.interactiveMessage && message.interactiveMessage.interactiveButtons && message.interactiveMessage.interactiveButtons[0].name === 'cta_copy') return 'cta_copy';
        if (message.interactiveMessage && message.interactiveMessage.interactiveButtons && message.interactiveMessage.interactiveButtons[0].name === 'cta_call') return 'cta_call';
        if (message.interactiveMessage && message.interactiveMessage.interactiveButtons && message.interactiveMessage.interactiveButtons[0].name === 'voice_call') return 'voice_call';
        if (message.interactiveResponseMessage && message.interactiveResponseMessage.nativeFlowResponseMessage && message.interactiveResponseMessage.nativeFlowResponseMessage.name === 'menu_options') return 'native_flow_menu_options_response';
        if (message.interactiveResponseMessage && message.interactiveResponseMessage.nativeFlowResponseMessage) return 'native_flow_response';

        if (message.interactiveMessage && message.interactiveMessage.interactiveButtons) return 'interactive_buttons';
        if (message.interactiveMessage && message.interactiveMessage.interactiveList) return 'interactive_list';
        if (message.interactiveResponseMessage) return 'interactive_response';

        if (message.interactiveMessage) return 'interactive_message';

        return 'unknown';
    }


    /** @private Extrai o conteúdo textual principal de qualquer tipo de mensagem. */
    static _extractBody(message) {
        return message?.conversation ||
            message?.extendedTextMessage?.text ||
            message?.imageMessage?.caption ||
            message?.videoMessage?.caption ||
            message?.associatedChildMessage?.message?.videoMessage?.caption ||
            message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
            message?.buttonsResponseMessage?.selectedDisplayText ||
            message?.listResponseMessage?.title ||
            message?.templateButtonReplyMessage?.selectedDisplayText ||
            message.interactiveResponseMessage?.body?.text ||
            message?.questionReplyMessage?.message?.extendedTextMessage?.text ||
            '';
    }

    /** @private Extrai e formata os dados de mídia. */
    static _enrichWithTypedData(normalized, rawMessage, client) {
        let content = rawMessage.message;
        let type = Object.keys(rawMessage.message).find(key => key != "messageContextInfo");
        if (type === 'associatedChildMessage') {
            content = rawMessage.message.associatedChildMessage.message;
            type = Object.keys(rawMessage.message.associatedChildMessage.message).find(key => key != "messageContextInfo");
        }
        const messageContent = content[type];
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage', 'documentWithCaptionMessage'];
        if (mediaTypes.includes(type)) {
            const rootData = content.documentWithCaptionMessage ? content.documentWithCaptionMessage : content;
            normalized.hasMedia = true;
            normalized.media = {
                mimetype: messageContent.mimetype || messageContent.message?.documentMessage?.mimetype,
                fileName: messageContent.fileName || messageContent.message?.documentMessage?.title,
                caption: messageContent.caption || messageContent.message?.documentMessage?.caption,
                duration: messageContent.seconds || null,
                isPtt: messageContent.ptt || false,
                isGif: messageContent.gifPlayback || false,
                isViewOnce: messageContent.viewOnce || false,
                getAttachments: () => client.messages.getAttachments(rootData)
            };
        }

        if (type === 'locationMessage') {
            normalized.location = {
                latitude: messageContent.degreesLatitude,
                longitude: messageContent.degreesLongitude
            };
        }

    }

    /** @private Extrai os dados de uma resposta interativa (botão/lista). */
    static _extractInteractiveReply(message) {
        const buttonReply = message?.buttonsResponseMessage;
        if (buttonReply) return { id: buttonReply.selectedButtonId, text: buttonReply.selectedDisplayText };

        const listReply = message?.listResponseMessage;
        if (listReply) return { id: listReply.singleSelectReply?.selectedRowId, text: listReply.title };

        const interactiveReply = message?.interactiveResponseMessage;
        if (interactiveReply) return { id: interactiveReply.nativeFlowResponseMessage.name, text: interactiveReply.nativeFlowResponseMessage.paramsJson };

        const questionReply = message?.questionReplyMessage;
        if (questionReply) return { id: questionReply.selectedButtonId, text: questionReply.selectedDisplayText };

        return null;
    }

    /** @private Extrai os dados de uma reação a uma mensagem. */
    static _extractReaction(message) {
        const reaction = message?.reactionMessage;
        if (!reaction) return null;
        return {
            emoji: reaction.text,
            reactedMessageId: reaction.key.id,
            senderTimestamp: new Date(Number(reaction.senderTimestampMs))
        };
    }

    /** @private Extrai os dados de um voto em uma enquete (descriptografado). */
    static async _extractPollUpdate(msg, client) {
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        const clientJid = client.jidNormalizedUser(client.sock.user.id);

        const message = msg.message;
        const pollUpdate = message?.pollUpdateMessage;
        if (!pollUpdate || !pollUpdate.pollCreationMessageKey) return null;
        let creationMsg = null;
        let pollEncKeyBuffer = null;
        let decryptPollVoteParams = null;
        try {
            // Recupera a mensagem de criação da enquete diretamente da store 
            creationMsg = await client.store.getMessage(
                pollUpdate.pollCreationMessageKey.remoteJid,
                pollUpdate.pollCreationMessageKey.id
            );

            if (!creationMsg) {
                return null;
            }

            creationMsg.raw.message.pollCreationMessage = creationMsg.raw.message.pollCreationMessage ? creationMsg.raw.message.pollCreationMessage :
                creationMsg.raw.message.pollCreationMessageV3;

            // Verifica se a mensagem de criação existe e tem a estrutura correta
            if (!creationMsg.raw.message.pollCreationMessage) {
                console.warn("Mensagem de criação da enquete não encontrada na store ou sem estrutura válida");
                return {
                    pollCreationMessageId: pollUpdate.pollCreationMessageKey?.id,
                    voterTimestamp: new Date(Number(pollUpdate.senderTimestampMs)),
                    selectedOptions: [],
                    error: "Poll creation message not found"
                };
            }

            if (!creationMsg || !creationMsg.raw.message.pollCreationMessage) {
                console.warn("Mensagem de criação da enquete sem estrutura válida");
                return {
                    pollCreationMessageId: pollUpdate.pollCreationMessageKey?.id,
                    voterTimestamp: new Date(Number(pollUpdate.senderTimestampMs)),
                    selectedOptions: [],
                    error: "Mensagem de criação da enquete sem estrutura válida"
                };
            }

            // Verifica se temos os dados necessários para descriptografia
            if (!creationMsg.raw.message.messageContextInfo.messageSecret ||
                !creationMsg.raw.message.pollCreationMessage.name ||
                !creationMsg.raw.message.pollCreationMessage.options) {
                console.warn("Mensagem de criação da enquete não contém dados necessários para descriptografia");
                return {
                    pollCreationMessageId: pollUpdate.pollCreationMessageKey?.id,
                    voterTimestamp: new Date(Number(pollUpdate.senderTimestampMs)),
                    selectedOptions: [],
                    error: "Incomplete poll creation data"
                };
            }

            pollEncKeyBuffer = Buffer.from(Object.values(creationMsg.raw.message.messageContextInfo.messageSecret));
            decryptPollVoteParams = {
                pollCreatorJid: creationMsg.raw.key.remoteJid,
                pollMsgId: creationMsg.raw.key.id,
                pollEncKey: pollEncKeyBuffer,
                voterJid: isGroup ? msg.key.participant : msg.key.fromMe ? clientJid : msg.key.remoteJid,
            };
            // Descriptografa os votos usando a mensagem bruta da store
            const decrypted = await client.decryptPollVote(pollUpdate.vote, decryptPollVoteParams);

            const selectedOptions = [];
            for (const decryptedHash of decrypted.selectedOptions) {
                const hashHex = Buffer.from(decryptedHash).toString('hex').toUpperCase();
                for (const option of creationMsg.raw.message.pollCreationMessage?.options || []) {
                    const hash = Buffer.from(digestSync("SHA-256", new TextEncoder().encode(Buffer.from(option.optionName).toString())))
                        .toString("hex")
                        .toUpperCase();
                    if (hashHex === hash) {
                        selectedOptions.push(option.optionName);
                        break;
                    }
                }
            }

            return {
                pollCreationMessageId: pollUpdate.pollCreationMessageKey?.id,
                voterTimestamp: new Date(Number(pollUpdate.senderTimestampMs)),
                selectedOptions,
                success: selectedOptions.length > 0
            };
        } catch (err) {
            console.error("Erro ao descriptografar voto:", err.message, {
                msg,
                pollUpdateMessage: pollUpdate,
                decryptPollVoteParams,
                errorStack: err.stack
            });

            return {
                pollCreationMessageId: pollUpdate.pollCreationMessageKey?.id,
                voterTimestamp: new Date(Number(pollUpdate.senderTimestampMs)),
                selectedOptions: [],
                error: err.message,
                code: err.code
            };
        }
    }

    /** @private Extrai os dados de uma mensagem de criação de enquete. */
    static _extractPollCreation(raw) {
        const message = raw.message;
        const poll = message?.pollCreationMessage || message.pollCreationMessageV3;
        if (!poll) return null

        return {
            id: raw.key.id,
            creator: {
                jid: raw.key.remoteJid,
                pushName: raw.pushName,
                verifiedBizName: raw.verifiedBizName
            },
            name: poll.name,
            selectableOptionsCount: poll.selectableOptionsCount,
            allowsMultipleAnswers: poll.selectableOptionsCount > 1,
            options: (poll.options || []).map(opt => ({
                name: opt.optionName || null,
                hash: opt.optionHash || null
            })),
            messageSecret: message.messageContextInfo?.messageSecret,
            senderTimestamp: poll.messageTimestamp
                ? new Date(Number(poll.messageTimestamp) * 1000)
                : null,
            raw: poll
        }
    }

    /** @private Extrai os dados de contatos enviados. */
    static _extractContacts(message) {
        const parseVcard = (vcard = '') => {
            const nameMatch = vcard.match(/FN:(.+)/);
            const numberMatch = vcard.match(/waid=(\d+)/);
            return {
                name: (nameMatch ? nameMatch[1] : '').replace(/\\/g, ''),
                number: numberMatch ? numberMatch[1] : ''
            };
        };

        const singleContact = message?.contactMessage;
        if (singleContact) return [parseVcard(singleContact.vcard)];

        const multiContact = message?.contactsArrayMessage?.contacts;
        if (multiContact) return multiContact.map(c => parseVcard(c.vcard));

        return [];
    }

    /** @private Extrai os dados de uma mensagem de resposta a uma pergunta. recebida de uma newsletter */
    static _extractQuestionReply(raw) {
        const message = raw.message;
        const questionReply = message?.questionReplyMessage;
        if (!questionReply) return null;

        return {
            id: raw.key.id,
            creator: {
                jid: raw.key.remoteJid,
                pushName: raw.pushName,
                verifiedBizName: raw.verifiedBizName
            },
            question: questionReply.question,
            answer: questionReply.answer,
            senderTimestamp: questionReply.messageTimestamp
                ? new Date(Number(questionReply.messageTimestamp) * 1000)
                : null,
            raw: questionReply
        }
    }

    /** @private Extrai os dados de uma mensagem de video. */
    static _extractVideo(raw) {
        const message = raw.message;
        const video = message?.videoMessage;
        if (!video) return null;

        return {
            id: raw.key.id,
            creator: {
                jid: raw.key.remoteJid,
                pushName: raw.pushName,
                verifiedBizName: raw.verifiedBizName
            },
            url: video.url,
            mimetype: video.mimetype,
            fileSha256: video.fileSha256,
            fileLength: video.fileLength,
            seconds: video.seconds,
            mediaKey: video.mediaKey,
            height: video.height,
            width: video.width,
            fileEncSha256: video.fileEncSha256,
            directPath: video.directPath,
            mediaKeyTimestamp: video.mediaKeyTimestamp,
            jpegThumbnail: video.jpegThumbnail,
            streamingSidecar: video.streamingSidecar,
            externalShareFullVideoDurationInSeconds: video.externalShareFullVideoDurationInSeconds,
            motionPhotoPresentationOffsetMs: video.motionPhotoPresentationOffsetMs,
            raw: video
        }
    }

}


module.exports = MessageNormalizer;