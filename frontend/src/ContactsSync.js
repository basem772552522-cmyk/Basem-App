// ContactsSync.js - إدارة تزامن جهات الاتصال

export class ContactsSync {
  constructor() {
    this.contacts = this.loadContacts();
  }

  // تحميل جهات الاتصال المحفوظة
  loadContacts() {
    try {
      const saved = localStorage.getItem('contacts');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('خطأ في تحميل جهات الاتصال:', error);
      return {};
    }
  }

  // حفظ جهات الاتصال
  saveContacts(contacts) {
    try {
      this.contacts = { ...this.contacts, ...contacts };
      localStorage.setItem('contacts', JSON.stringify(this.contacts));
      return true;
    } catch (error) {
      console.error('خطأ في حفظ جهات الاتصال:', error);
      return false;
    }
  }

  // تزامن جهات الاتصال من المتصفح
  async syncBrowserContacts() {
    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const permission = await navigator.permissions.query({name: 'contacts'});
        
        if (permission.state === 'granted' || permission.state === 'prompt') {
          const props = ['name', 'email'];
          const opts = { multiple: true };
          
          const contactList = await navigator.contacts.select(props, opts);
          const contactMap = {};
          
          contactList.forEach(contact => {
            if (contact.email && contact.email.length > 0) {
              contact.email.forEach(email => {
                if (contact.name && contact.name.length > 0) {
                  contactMap[email.toLowerCase()] = contact.name[0];
                }
              });
            }
          });
          
          this.saveContacts(contactMap);
          return { success: true, count: Object.keys(contactMap).length };
        } else {
          return { success: false, error: 'إذن الوصول مرفوض' };
        }
      } else {
        return { success: false, error: 'Contacts API غير مدعوم' };
      }
    } catch (error) {
      console.error('خطأ في تزامن جهات الاتصال:', error);
      return { success: false, error: error.message };
    }
  }

  // رفع ملف CSV لجهات الاتصال
  parseContactsFile(fileContent) {
    try {
      const lines = fileContent.split('\n');
      const contactMap = {};
      
      // تخطي العنوان إذا وجد
      const startIndex = lines[0] && (lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('email')) ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const parts = line.split(',').map(part => part.trim().replace(/"/g, '').replace(/'/g, ''));
          
          if (parts.length >= 2) {
            let name = '';
            let email = '';
            
            // تحديد أيهما الاسم وأيهما البريد
            if (parts[0].includes('@')) {
              email = parts[0];
              name = parts[1];
            } else if (parts[1].includes('@')) {
              name = parts[0];
              email = parts[1];
            }
            
            if (email && name && this.isValidEmail(email)) {
              contactMap[email.toLowerCase()] = name;
            }
          }
        }
      }
      
      this.saveContacts(contactMap);
      return { success: true, count: Object.keys(contactMap).length };
    } catch (error) {
      console.error('خطأ في معالجة ملف جهات الاتصال:', error);
      return { success: false, error: error.message };
    }
  }

  // التحقق من صحة البريد الإلكتروني
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // الحصول على الاسم المعروض
  getDisplayName(user) {
    if (!user) return '';
    
    // البحث في جهات الاتصال
    const contactName = this.contacts[user.email?.toLowerCase()];
    if (contactName) {
      return contactName;
    }
    
    // استخدام اسم المستخدم كبديل
    return user.username || user.email || 'مستخدم غير معروف';
  }

  // البحث في جهات الاتصال
  searchContacts(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    Object.entries(this.contacts).forEach(([email, name]) => {
      if (name.toLowerCase().includes(lowerQuery) || email.toLowerCase().includes(lowerQuery)) {
        results.push({ email, name });
      }
    });
    
    return results;
  }

  // الحصول على عدد جهات الاتصال
  getContactsCount() {
    return Object.keys(this.contacts).length;
  }

  // مسح جميع جهات الاتصال
  clearContacts() {
    this.contacts = {};
    localStorage.removeItem('contacts');
    return true;
  }

  // إضافة جهة اتصال يدوياً
  addContact(email, name) {
    if (!this.isValidEmail(email) || !name.trim()) {
      return { success: false, error: 'بيانات غير صحيحة' };
    }
    
    const contactMap = { [email.toLowerCase()]: name.trim() };
    this.saveContacts(contactMap);
    return { success: true };
  }

  // حذف جهة اتصال
  removeContact(email) {
    if (this.contacts[email.toLowerCase()]) {
      delete this.contacts[email.toLowerCase()];
      localStorage.setItem('contacts', JSON.stringify(this.contacts));
      return { success: true };
    }
    return { success: false, error: 'جهة الاتصال غير موجودة' };
  }
}

export default ContactsSync;