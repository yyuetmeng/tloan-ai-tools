// Replace these values with your own Firebase project's config.
// Firebase Console -> Project settings -> General -> Your apps -> SDK setup and configuration.
// This file is safe to commit publicly: these are client identifiers, not secrets.
// Access control is enforced separately by firestore.rules (see README).

export const firebaseConfig = {
 
  
  apiKey: "AIzaSyA5wehYgzZDo7riLk_wNcytehHxPlSWzuE", // Locate this in Project Settings > General in the Firebase Console
  authDomain: "catalogue-f9664.firebaseapp.com",
  projectId: "catalogue-f9664",
  storageBucket: "catalogue-f9664.firebasestorage.app", // Or catalogue-f9664.appspot.com
  messagingSenderId: "979407284895",
  appId: "1:979407284895:web:56ca7f289d2d435f9c90aa", // Locate this in Project Settings under 'Your apps'
  
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

// Optional: URL of the deployed Java catalogue service (catalogue-service/), e.g.
// "https://tloan-catalogue-service.onrender.com". Leave empty to use the built-in list in app.js.
export const catalogueApiUrl = "";
