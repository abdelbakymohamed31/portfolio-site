# 🔒 قواعد أمان Firebase (Security Rules)

لضمان رفع أي فيديو أو صورة من لوحة التحكم وملاحظة التأثير فوراً بدون أي قيود أو رفض، يرجى التأكد من تطبيق هذه القواعد في حساب Firebase الخاص بموقع **الأمير**:

---

## 1. قواعد أمان Firestore Database

اذهب إلى [Firebase Console](https://console.firebase.google.com) -> **Firestore Database** -> التبويب **Rules**، ثم استبدل القواعد بالقواعد التالية واضغط **Publish**:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 2. قواعد أمان Storage (مساحة رفع الفيديوهات والصور)

اذهب إلى [Firebase Console](https://console.firebase.google.com) -> **Storage** -> التبويب **Rules**، ثم استبدل القواعد بالقواعد التالية واضغط **Publish**:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

---

## ✅ الفوائد بعد تطبيق القواعد:
1. رفع أي فيديو بحجم كبير وبدون حد أقصى مباشرة إلى Firebase Storage.
2. مزامنة فورية (Real-Time) لأي فيديو أو تعديل يظهر فوراً للزوار بدون حتى إعادة تحميل الصفحة.
3. التغلب على أي قيود في الرفع أو تصريح الحسابات.

