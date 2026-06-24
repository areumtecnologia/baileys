// Classe para manipular envio e gerenciamento de status seguindo padrao de handlers
// Envia uma mensagem de status e mensiona apos a publicacao
// const msgRes = await sock.sendMessage(`${channel}@broadcast`,
//     // { text: 'UnityChat já está disponível. Acesse https://unitychat.areum.com.br e teste grátis por 30 dias!' },
//     {
//         image: { url: 'https://unitychat.areum.com.br/assets/img/001.jpg' },
//         caption: 'UnityChat já está disponível. Acesse https://unitychat.areum.com.br e teste grátis por 30 dias!',
//     },
//     {
//         broadcast: true,
//         backgroundColor: '#288d7c85',
//         font: 2,
//         statusJidList: [
//             '559187513656@s.whatsapp.net',
//             // '559181648646@s.whatsapp.net',
//             // '559184185577@s.whatsapp.net',
//         ]
//     });
// console.log(msgRes);
// const remoteJid = '120363421363321743@g.us';
// const rs = await sock.sendMessage(remoteJid, { text: 'hello word' }, { quoted: msgRes });
// 
// Envia uma mensagem de status e mensiona na mesma publicacao
// const jidat = [
//                 '120363421363321743@g.us',
//                 '559184185577@s.whatsapp.net'
//             ]
//             // Text
//             const x = await sock.sendStatusMentions(
//                 {
//                     text: 'Hello Everyone :3',
//                     font: 2, // optional
//                     textColor: 'FF0000', // optional
//                     backgroundColor: '#000000' // optional
//                 },
//                 jidat // Limit to 5 mentions per status
//             );

class StatusHandler {
    constructor(client) {
        this.client = client;
    }

    async send(jids, content, options = { sendMentions: false }) {
        this.client._validateConnection();
        if (!Array.isArray(jids)) {
            throw new Error('jids must be an array of JIDs');
        }
        let result = null;
        if (options.sendMentions) {
            // limitar o numero de jids do array até 5 por mensagem (limite imposto pelo WhatsApp)
            jids = jids.slice(0, 5);
            result = await this.client.sock.sendStatusMentions(content, jids, options);
        } else {
            result = await this.client.sock.sendMessage('status@broadcast', content, {
                broadcast: true,
                backgroundColor: options.backgroundColor || '#288d7c85',
                font: options.font || 1,
                statusJidList: jids
            });
        }
        return await this.client.messages.normalize(result);
    }

    // Remover uma mensagem de status
    async delete(msg) {
        this.client._validateConnection();
        return await this.client.sock.sendMessage('status@broadcast', { delete: msg });
    }

}
