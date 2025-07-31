require("dotenv").config();

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = requie("qrcode-terminal");
const sqlite3 = require("sqlite3");
const axios = require("axios");
const path = require("path");

const client = null;


const db = new sqlite3.Database(path.resolve(__dirname, "../db/contacts.db"));
db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE,
    contact_id TEXT
    conversation_id TEXT
)`);

async function sendMessageToChatWoot(contactId, conversationId, content) {
    try {
        await axios.post(
            `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}`,
            {
                content: content,
                message_type: "incoming",
                private: true
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    api_access_token: proccess.env.CHATWOOT_API_TOKEN,
                },
            }
        );
    } catch (error) {
        console.error("Error sending message to Chatwoot", error.message);
    };
};

async function startWhatsApp() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {headless: false, args: ["--no-sandbox"]},
    });

    client.on("qr", (qr) => qrcode.generate(qr, {small: true}));
    client.on("ready", () => {
        console.log("Connected to whatsapp!");
    });
    client.on("message", async (msg) => {
        const rawnumber = msg.from;
        const messageText = msg.body;
        const numberEI64 = `+${rawnumber.replace("@c.us", "")}`;

        db.get(
            "SELECT * FROM contacts WHERE number = ?",
            [numberEI64],
            async (err, row) => {
                if (row) {
                    await sendMessageToChatWoot(
                        row.contact_id,
                        row.conversation_id,
                        messageText
                    );
                } else {
                    try {
                        const contact = await axios.post(
                            `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/contacts`,
                            {
                                inbox_id: proccess.env.CHATWOOT_INBOX_ID,
                                name: numberEI64,
                                identifier: numberEI64,
                                phone_number: numberEI64,
                                custom_attributes: { whatsapp: true},
                            },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    api_access_token: proccess.env.CHATWOOT_API_TOKEN,
                                },
                            }
                        );
                        console.log(`Contact created: ${JSON.stringify(contact.data)}`);

                        const contactId = contact.data.payload.contact.id;
                        const conversation = await axios.post(
                            `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/contacts`,
                            {
                                source_id: numberEI64,
                                inbox_id: proccess.env.CHATWOOT_INBOX_ID,
                                contact_id: contactId,
                            },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    api_access_token: proccess.env.CHATWOOT_API_TOKEN,
                                },
                            }
                        );

                        const conversationId = conversation.data.id;

                        db.run(
                            "INSERT INTO contacts (number, contact_id, conversation_id) VALUES (?, ?, ?)",
                            [numberEI64, contactId, conversationId]
                        );

                        await sendMessageToChatWoot(contactId, conversationId, messageText);
                    } catch (error) {
                        console.log("Error creating contact/conversation", error.message)
                    };
                };
            }
        );
    });
};

module.exports = {
  startWhatsApp,
  getClient: () => client,
};