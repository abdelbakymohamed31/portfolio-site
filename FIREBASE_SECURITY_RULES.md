# 🔒 قواعد أمان Firebase (Security Rules)

هذا الملف يحتوي على قواعد الأمان التي يجب عليك نسخها ولصقها في لوحة تحكم Firebase لحماية بيانات موقعك وصورك وفيديوهاتك من التعديل بواسطة أي شخص غير مصرح له، مع السماح للزوار بمشاهدتها.

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

## 2. قواعد أمان Storage (مساحة رفع الفيديوهات والصور)

قم بالذهاب إلى لوحة تحكم Firebase -> **Storage** -> التبويب **Rules**، ثم استبدل القواعد الحالية بالقواعد التالية واضغط **Publish**:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // السماح للجميع بـ استعراض وتحميل الصور والفيديوهات
    // السماح فقط للمسؤول (المسجل دخوله) بـ رفع ملفات جديدة أو حذفها
    // لا يوجد حد أقصى لحجم الفيديو
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## ⚠️ ملاحظة مهمة

تأكد أن Firebase Storage مفعل في مشروعك:
1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. اختر مشروعك
3. اذهب إلى **Storage** من القائمة الجانبية
4. إذا لم يكن مفعلاً، اضغط **Get Started** واختر المنطقة الأقرب
5. الصق قواعد الأمان أعلاه واضغط **Publish**
