/* أعمدة قالب الاستيراد (يستخدمها منشئ القالب وقارئ الاستيراد) */
(function(root){
const cols=[
 {k:'project',h:'المشروع',req:1,w:26,note:'اسم المشروع كما تريده أن يظهر'},
 {k:'pno',h:'رقم المشروع',w:12},
 {k:'unit',h:'الوحدة',req:1,w:14,note:'رقم أو اسم الوحدة'},
 {k:'owner',h:'المالك',w:26},
 {k:'tenant',h:'المستأجر',req:1,w:28},
 {k:'rent',h:'قيمة الإيجار',req:1,w:16,t:'num',note:'إجمالي قيمة العقد (أو إيجار سنة واحدة حسب الإعداد في التطبيق)'},
 {k:'fee',h:'رسوم الأملاك',w:14,t:'num'},
 {k:'start',h:'بداية الإيجار',req:1,w:15,t:'date',note:'بصيغة 2026-01-31'},
 {k:'end',h:'نهاية الإيجار',req:1,w:15,t:'date'},
 {k:'period',h:'مدة العقد (نص)',w:14,note:'اختياري، يُستخدم عند غياب التواريخ مثل: سنة، 3 شهور'},
 {k:'count',h:'عدد الأقساط في السنة',req:1,w:14,note:'رقم (1، 2، 4، 12) أو: شهري، دفعتين، واحدة'},
 {k:'notes',h:'ملاحظات',w:30},
 ...Array.from({length:12},(_,i)=>({k:'pay'+(i+1),h:'سداد '+(i+1),w:12,t:'num',pay:1})),
];
const api={cols};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TplCols=api;
})(typeof window!=='undefined'?window:globalThis);
