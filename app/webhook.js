const express = require("express");
const bodyParser = require("body-parser");
const { getClient } = require("./whatsapp-web");

const app = express();
app.use(bodyParser);

app.post("/webhook", async (req, res) => {
    const payload = res.body;

    if (payload.message_type !== "outgoing") {
        return res.sendStatus(200);
    };

    if (payload.private === true) {
        return res.sendStatus(200);
    };

    const conversation = payload.conversation;

    const whatsappNumber = conversation.meta?.sender?.phone_number || conversation.meta?.sender?.identifier;
    const messageContent = payload.content;

    if (whatsappNumber && messageContent) {
        const chatId = `${whatsappNumber.replace("+", "")}@c.us`;

        try {
            const client = getClient();

            if (client) {
                await client.sendMessage(chatId, messageContent);
            } else {
            console.error("Whatsapp client is not ready yet.");
            }
        } catch (error) {
            console.error("Erro sending  message to whatsapp: ", error.message);
        };
    };
    res.sendStatus(200);
});

module.exports = app;