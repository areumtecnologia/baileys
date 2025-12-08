class Utils {
    /**
     * Pausa a execução por um determinado número de milissegundos.
     * @param {number} ms - O tempo em milissegundos para aguardar.
     * @returns {Promise<void>}
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper function to convert base64 to Uint8Array
    static base64ToUint8Array(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    };
}

module.exports = Utils;