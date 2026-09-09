// إعدادات Firebase الخاصة بموقع الأمير

const firebaseConfig = {
  apiKey: "AIzaSyDXbiUy6mebL_shQdJRYlQzy6lO4_OlJGI",
  authDomain: "alamerup-new.firebaseapp.com",
  projectId: "alamerup-new",
  storageBucket: "alamerup-new.firebasestorage.app",
  messagingSenderId: "483541792553",
  appId: "1:483541792553:web:ad5a28139c444bba72e938"
};

// تهيئة Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// تصدير الأدوات للاستخدام في الصفحات الأخرى
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
