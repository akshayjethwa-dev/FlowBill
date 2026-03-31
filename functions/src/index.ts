import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({region: "asia-south1"});

export const helloFlowBill = onRequest((req, res) => {
  res.json({status: "FlowBill functions online"});
});

// ✅ Export the new invoice functions
export * from "./invoices";
export * from "./payments";
export * from "./whatsapp";    // ✅ Export WhatsApp tools
export * from "./reminders";
export * from "./conversions";