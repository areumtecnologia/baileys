const wb = require('@whiskeysockets/baileys');
const {
    Browsers,
    makeWASocket,
    decryptPollVote,
    DisconnectReason,
    jidNormalizedUser,
    downloadContentFromMessage,
    downloadMediaMessage,
    getContentType,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
} = require('@itsukichan/baileys');

module.exports = {
    whiskeysocketsMakeWASocket: wb.makeWASocket,
    itsukichanMakeWASocket: makeWASocket,
    Browsers,
    decryptPollVote,
    DisconnectReason,
    jidNormalizedUser,
    downloadContentFromMessage,
    downloadMediaMessage,
    getContentType,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
};
