import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";

// ✅ Safely initialize Firebase Admin ONCE
if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({region: "asia-south1"});

export const helloFlowBill = onRequest((req, res) => {
  res.json({status: "FlowBill functions online"});
});

// ✅ Export ONLY Firebase triggers
export * from "./invoices";
export * from "./payments";
// ❌ whatsapp.ts is REMOVED from here. It should only be imported where used.
export * from "./reminders";
export * from "./conversions";