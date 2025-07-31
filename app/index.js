require("dotenv").config();
const express = require("express");
const whatsapp = require("./whatsapp-web.js");
const webhookApp= require("./webhook.js");

const PORT = process.env.PORT || 3100;
const app = express();

whatsapp.startWhatsApp();

app.use("/", webhookApp);

app.listen(PORT, () => {
    console.log("Webhook server running on port "+ PORT)
});