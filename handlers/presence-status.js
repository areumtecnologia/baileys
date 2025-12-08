class PresenceStatus {
    static COMPOSING = 'composing';      // digitando...
    static RECORDING = 'recording';      // gravando áudio...
    static PAUSED = 'paused';            // parou de digitar/gravar
    static AVAILABLE = 'available';      // online
    static UNAVAILABLE = 'unavailable';  // offline
}

module.exports = PresenceStatus;
