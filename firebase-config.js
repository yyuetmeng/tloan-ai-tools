// Replace these values with your own Firebase project's config.
// Firebase Console -> Project settings -> General -> Your apps -> SDK setup and configuration.
// This file is safe to commit publicly: these are client identifiers, not secrets.
// Access control is enforced separately by firestore.rules (see README).

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// EmailJS is used to send the notification emails at each workflow stage,
// since a static site has no server to send mail from.
// Sign up free at https://www.emailjs.com, then fill these in.
export const emailjsConfig = {
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  templates: {
    newRequest: "template_new_request",     // sent to the approver
    decision: "template_decision",          // sent to the requester (approved/rejected)
    issued: "template_issued",              // sent to the requester
    returned: "template_returned",          // sent to requester + approver
  },
};
