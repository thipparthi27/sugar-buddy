/* common.js - storage, auth, reminders, helpers */

// keys
const LS_USERS = 'sb_k1_users_v1';
const LS_CUR = 'sb_k1_current_user';

// new user template
function newUserTemplate(name,email,mobile,password){
  return {
    id: 'u_' + Math.random().toString(36).slice(2,9),
    name: name || 'User',
    email: email || null,
    mobile: mobile || null,
    password: password || 'pass',
    profile: { age:null, height:null, weight:null, hba1c:null, target_hba1c:null, language:'en' },
    mealsTemplate: {
      Sunday: "Free / any",
      Monday: "Millets (B), Millets (L), Fruits (snack), Java (D)",
      Tuesday: "Millets (B), Millets (L), Fruits, Oats (D)",
      Wednesday: "Millets (B), Millets (L), Fruits, Jonna dosa (D)",
      Thursday: "Millets (B), Millets (L), Fruits, Upma (D)",
      Friday: "Millets (B), Millets (L), Fruits, Jonna mudda (D)",
      Saturday: "Millets (B), Millets (L), Fruits, Gadka (D)"
    },
    history: {} // keyed by YYYY-MM-DD; stores sugar, water_ml, water_hours, checklist, insulin arrays
  };
}

// storage helpers
function loadUsers(){ try{ return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); }catch(e){ return []; } }
function saveUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }
function findUserByLoginId(id){
  if(!id) return null; const v = id.trim().toLowerCase();
  return loadUsers().find(u => (u.email && u.email.toLowerCase()===v) || (u.mobile && u.mobile===id.trim()) || (u.name && u.name.toLowerCase()===v));
}
function findUserById(id){ return loadUsers().find(u=>u.id===id); }
function setCurrentUserId(id){ localStorage.setItem(LS_CUR, id); }
function getCurrentUserId(){ return localStorage.getItem(LS_CUR); }
function clearCurrentUser(){ localStorage.removeItem(LS_CUR); }

// ensure today object exists
function ensureTodayHistory(id){
  const users = loadUsers(); const idx = users.findIndex(u=>u.id===id);
  if(idx === -1) return;
  const tk = new Date().toISOString().slice(0,10);
  users[idx].history[tk] = users[idx].history[tk] || {};
  saveUsers(users);
}
function ensureTodayHistoryForCurrentUser(){ const id = getCurrentUserId(); if(id) ensureTodayHistory(id); }

// midnight schedule to create next day object when page open
function scheduleMidnightReset(){
  const now = new Date();
  const next = new Date(); next.setHours(24,0,5,0);
  const ms = next - now;
  setTimeout(()=> { ensureTodayHistoryForCurrentUser(); scheduleMidnightReset(); }, ms);
}

/* ------- Notifications & reminders (in-page) ------- */
function showNotification(title, body){
  if('Notification' in window && Notification.permission === 'granted'){
    try{
      const n = new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' });
      n.onclick = ()=> window.focus();
    }catch(e){ console.warn('Notification error', e); }
  }
}

// schedule hourly reminders while app open
let hourlyTimer = null;
function scheduleHourlyReminders(){
  if(hourlyTimer) clearInterval(hourlyTimer);
  const now = new Date(); const msToNext = (60 - now.getMinutes())*60*1000 - now.getSeconds()*1000;
  setTimeout(()=> {
    showNotification('SugarBuddy — Reminder','Hourly check: how is your routine?');
    hourlyTimer = setInterval(()=> showNotification('SugarBuddy — Reminder','Hourly check: how is your routine?'), 60*60*1000);
  }, msToNext);
}

// insulin schedule
let insulinTimers = [];
function scheduleInsulinAlarms(){
  insulinTimers.forEach(t=>clearTimeout(t)); insulinTimers=[];
  const schedule = [
    {time:'07:00', text:'Human Actrapid — 15 units (morning)'},
    {time:'12:30', text:'Human Actrapid — 20 units (afternoon)'},
    {time:'19:00', text:'Human Actrapid — 15 units (evening)'},
    {time:'22:00', text:'Baslog — 20 units (night)'}
  ];
  const now = new Date();
  schedule.forEach(item=>{
    const [hh,mm] = item.time.split(':').map(Number);
    const target = new Date(); target.setHours(hh,mm,5,0);
    if(target - now <= 0) target.setDate(target.getDate()+1);
    const ms = target - now;
    const id = setTimeout(function alarm(){
      showNotification('Insulin Reminder', item.text);
      const id2 = setTimeout(alarm, 24*60*60*1000);
      insulinTimers.push(id2);
    }, ms);
    insulinTimers.push(id);
  });
}

