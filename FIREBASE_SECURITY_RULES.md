# 🔒 قواعد أمان Firebase (Security Rules)

هذا الملف يحتوي على قواعد الأمان التي يجب عليك نسخها ولصقها في لوحة تحكم Firebase لحماية بيانات موقعك وصورك من التعديل بواسطة أي شخص غير مصرح له، مع السماح للزوار بمشاهدتها.

---

## 1. قواعد أمان Firestore Database

قم بالذهاب إلى لوحة تحكم Firebase -> **Firestore Database** -> التبويب **Rules**، ثم استبدل القواعد الحالية بالقواعد التالية واضغط **Publish**:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // السماح للجميع بـ قراءة البيانات (الزوار)
    // السماح فقط للمسؤول (المسجل دخوله) بـ الكتابة والتعديل والحذف
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 2. قواعد أمان Storage (مساحة رفع الصور)

قم بالذهاب إلى لوحة تحكم Firebase -> **Storage** -> التبويب **Rules**، ثم استبدل القواعد الحالية بالقواعد التالية واضغط **Publish**:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // السماح للجميع بـ استعراض وتحميل الصور
    // السماح فقط للمسؤول (المسجل دخوله) بـ رفع صور جديدة أو حذفها
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
