import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";

// ─── STRIPE INTEGRATION LAYER ─────────────────────────────────────────────────
// Replace these with real keys + backend endpoints in production
const STRIPE_CONFIG = {
  publishableKey: "pk_test_YOUR_KEY_HERE",
  backendUrl: "https://your-backend.com/api", // Node/Supabase/etc
  endpoints: {
    createPaymentIntent: "/payments/create-intent",
    payoutToRep:         "/payouts/rep",
    chargeClient:        "/charges/client",
    refund:              "/payments/refund",
  },
};

// Simulated payment processor — replace body with real fetch() calls to your backend
async function processStripeCharge({ amount, currency = "usd", description, clientEmail, metadata }) {
  // PRODUCTION: POST to STRIPE_CONFIG.backendUrl + STRIPE_CONFIG.endpoints.createPaymentIntent
  console.log("[STRIPE] Charge intent:", { amount, currency, description, clientEmail, metadata });
  await new Promise(r => setTimeout(r, 1200));
  return { success: true, chargeId: "ch_" + Math.random().toString(36).slice(2), amount };
}

async function processStripePayout({ amount, currency = "usd", repName, bankAccount, description }) {
  // PRODUCTION: POST to STRIPE_CONFIG.backendUrl + STRIPE_CONFIG.endpoints.payoutToRep
  // Requires Stripe Connect or bank transfer API
  console.log("[STRIPE] Payout intent:", { amount, currency, repName, bankAccount, description });
  await new Promise(r => setTimeout(r, 1200));
  return { success: true, payoutId: "po_" + Math.random().toString(36).slice(2), amount };
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { id: "pulse",     name: "PULSE",           price: 149, color: "#1262ff" },
  { id: "ascend",    name: "ASCEND",           price: 249, color: "#ff8a1f" },
  { id: "crown",     name: "CROWN",            price: 399, color: "#d9aa4f" },
  { id: "takeover",  name: "HOME TAKEOVER",    price: 599, color: "#07182d" },
  { id: "zona",      name: "ZONA SPONSOR",     price: 299, color: "#0b213d" },
  { id: "content",   name: "CONTENT",          price: 199, color: "#3446c5" },
  { id: "lead",      name: "LEAD BOOST",       price: 500, color: "#ff8a1f" },
  { id: "promotora", name: "PROMOTORA",        price: 399, color: "#1262ff" },
  { id: "mortgage",  name: "MORTGAGE PARTNER", price: 699, color: "#8a5b00" },
];
let _products = INITIAL_PRODUCTS;
const product = (id) => _products.find(p => p.id === id) || _products[0];

const RANKS = [
  { name: "BRONZE",       threshold: 0,   bonus: 0,    color: "#9a4b00" },
  { name: "SILVER",       threshold: 10,  bonus: 250,  color: "#475569" },
  { name: "GOLD",         threshold: 30,  bonus: 500,  color: "#8a5b00" },
  { name: "PLATINUM",     threshold: 60,  bonus: 1000, color: "#0e7490" },
  { name: "BLACK DIAMOND",threshold: 120, bonus: 2500, color: "#020617" },
];

const USERS = [
  { name: "Eduardo Romero", email: "admin@inmoproyectospanama.com",    password: "admin123",    role: "admin" },
  { name: "Team Manager",   email: "manager@inmoproyectospanama.com",  password: "manager123",  role: "manager" },
  { name: "Comercial Demo", email: "comercial@inmoproyectospanama.com",password: "comercial123",role: "commercial" },
];

const INITIAL_REPS = [
  { id: 1, name: "María Durán",     phone: "50760001122", email: "maria@inmoproyectospanama.com",
    city: "Ciudad de Panamá", status: "Activo", role: "manager",
    initialCommissionPercent: 50, recurringCommissionPercent: 20,
    // Extended fields
    lastName: "Durán", dni: "8-123-456", ruc: "123456-1-123456DV25",
    address: "Calle 50, Marbella, PH 2", birthdate: "1988-03-15",
    linkedin: "linkedin.com/in/mariaduran", instagram: "@mariaduran_realty",
    cargo: "Sales Manager", department: "Comercial",
    bankName: "Banco General", bankIban: "PA12BGEN0000000123456789", bankHolder: "María Durán",
    bankSwift: "BGENPAPAXX", bankAccount: "040-123456-0",
    fiscalName: "María Durán", fiscalAddress: "Calle 50, Marbella", fiscalRuc: "123456-1-123456DV25",
    emergencyContact: "Luis Durán", emergencyPhone: "50760009999",
    notes: "Manager fundadora. Especialista en Costa del Este y Marbella.",
    documents: [], hireDate: "2023-01-15", pendingCollectionOverride: "", monthlyDueOverride: "" },
  { id: 2, name: "Carlos Méndez",   phone: "50760008844", email: "carlos@inmoproyectospanama.com",
    city: "Costa del Este", status: "Activo", role: "commercial",
    initialCommissionPercent: 50, recurringCommissionPercent: 20,
    lastName: "Méndez", dni: "8-234-567", ruc: "",
    address: "Costa del Este, Calle 77B", birthdate: "1992-07-22",
    linkedin: "", instagram: "@carlosmendez",
    cargo: "Ejecutivo Comercial", department: "Comercial",
    bankName: "Banistmo", bankIban: "PA12BANI0000000234567890", bankHolder: "Carlos Méndez",
    bankSwift: "BANIPAPAXX", bankAccount: "050-234567-1",
    fiscalName: "Carlos Méndez", fiscalAddress: "Costa del Este", fiscalRuc: "",
    emergencyContact: "Ana Méndez", emergencyPhone: "50760008800",
    notes: "", documents: [], hireDate: "2023-06-01", pendingCollectionOverride: "", monthlyDueOverride: "" },
  { id: 3, name: "Andrea Castillo", phone: "50760003388", email: "andrea@inmoproyectospanama.com",
    city: "Bella Vista", status: "En prueba", role: "commercial",
    initialCommissionPercent: 45, recurringCommissionPercent: 15,
    lastName: "Castillo", dni: "8-345-678", ruc: "",
    address: "Bella Vista, Av. Balboa", birthdate: "1995-11-08",
    linkedin: "", instagram: "",
    cargo: "Ejecutiva Comercial Jr.", department: "Comercial",
    bankName: "Global Bank", bankIban: "", bankHolder: "Andrea Castillo",
    bankSwift: "", bankAccount: "060-345678-2",
    fiscalName: "Andrea Castillo", fiscalAddress: "Bella Vista", fiscalRuc: "",
    emergencyContact: "", emergencyPhone: "",
    notes: "En período de prueba. Revisión en 2026-07-01.", documents: [], hireDate: "2026-04-01", pendingCollectionOverride: "", monthlyDueOverride: "" },
  { id: 4, name: "Luis Navarro",    phone: "50760004455", email: "luis@inmoproyectospanama.com",
    city: "San Francisco", status: "Activo", role: "commercial",
    initialCommissionPercent: 55, recurringCommissionPercent: 22,
    lastName: "Navarro", dni: "8-456-789", ruc: "456789-1-456789DV10",
    address: "San Francisco, Calle 65", birthdate: "1985-02-28",
    linkedin: "linkedin.com/in/luisnavarro", instagram: "",
    cargo: "Senior Sales Executive", department: "Comercial",
    bankName: "Banco General", bankIban: "PA12BGEN0000000456789012", bankHolder: "Luis Navarro",
    bankSwift: "BGENPAPAXX", bankAccount: "040-456789-3",
    fiscalName: "Luis Navarro Consulting S.A.", fiscalAddress: "San Francisco, Calle 65", fiscalRuc: "456789-1-456789DV10",
    emergencyContact: "Carmen Navarro", emergencyPhone: "50760004400",
    notes: "Top performer. Bonus negociado al 55/22.", documents: [], hireDate: "2023-01-15", pendingCollectionOverride: "", monthlyDueOverride: "" },
];

const INITIAL_CLIENTS = [
  { id: 101, company: "Grupo Urbana", contactName: "Roberto Sánchez", contactRole: "Director de Marketing",
    phone: "50762001001", email: "roberto@grupourbana.com",
    address: "Punta Pacífica, Torre Oceania, Piso 18", city: "Ciudad de Panamá",
    ruc: "100111-1-100111DV05", fiscalName: "Grupo Urbana S.A.", fiscalAddress: "Punta Pacífica",
    bankName: "Banco General", bankAccount: "040-100111-0", bankHolder: "Grupo Urbana S.A.",
    website: "grupourbana.com", linkedin: "", instagram: "@grupourbana",
    notes: "Cliente premium. Pago puntual.", documents: [], createdAt: "2026-05-01",
    stripeCustomerId: "" },
  { id: 102, company: "Pacific Developers", contactName: "Elena Vargas", contactRole: "CEO",
    phone: "50762002002", email: "elena@pacificdevelopers.com",
    address: "Costa del Este, Punta Colon", city: "Ciudad de Panamá",
    ruc: "200222-1-200222DV10", fiscalName: "Pacific Developers Corp.", fiscalAddress: "Costa del Este",
    bankName: "Banistmo", bankAccount: "050-200222-1", bankHolder: "Pacific Developers Corp.",
    website: "pacificdevelopers.com", linkedin: "", instagram: "",
    notes: "Cobro pendiente desde mayo.", documents: [], createdAt: "2026-05-02",
    stripeCustomerId: "" },
  { id: 103, company: "Bella Vista Living", contactName: "Marco Delgado", contactRole: "Gerente Comercial",
    phone: "50762003003", email: "marco@bellavistliving.com",
    address: "Bella Vista, Av. Federico Boyd", city: "Ciudad de Panamá",
    ruc: "", fiscalName: "Bella Vista Living S.A.", fiscalAddress: "Bella Vista",
    bankName: "", bankAccount: "", bankHolder: "",
    website: "", linkedin: "", instagram: "",
    notes: "", documents: [], createdAt: "2026-05-03",
    stripeCustomerId: "" },
  { id: 104, company: "Banco Aliado", contactName: "Sofía Torres", contactRole: "VP Marketing",
    phone: "50762004004", email: "sofia@bancoaliado.com",
    address: "Marbella, Calle 53", city: "Ciudad de Panamá",
    ruc: "400444-1-400444DV20", fiscalName: "Banco Aliado S.A.", fiscalAddress: "Marbella, Calle 53",
    bankName: "Banco Aliado", bankAccount: "Internal", bankHolder: "Banco Aliado S.A.",
    website: "bancoaliado.com", linkedin: "", instagram: "",
    notes: "", documents: [], createdAt: "2026-05-04",
    stripeCustomerId: "" },
  { id: 105, company: "Costa Prime", contactName: "Andrés Mora", contactRole: "Director",
    phone: "50762005005", email: "andres@costaprime.com",
    address: "San Francisco, Calle 74", city: "Ciudad de Panamá",
    ruc: "", fiscalName: "Costa Prime S.A.", fiscalAddress: "San Francisco",
    bankName: "", bankAccount: "", bankHolder: "",
    website: "", linkedin: "", instagram: "",
    notes: "", documents: [], createdAt: "2026-05-05",
    stripeCustomerId: "" },
];

const INITIAL_OPPS = [
  { id: 1, promoter: "Grupo Urbana",      clientId: 101, productId: "crown",    repId: 1, stage: "Ganado", probability: 100, paymentStatus: "Pagado",   contractStatus: "Firmado",      createdAt: "2026-05-01", updatedAt: "2026-05-01", notes: [] },
  { id: 2, promoter: "Pacific Developers",clientId: 102, productId: "takeover", repId: 4, stage: "Ganado", probability: 100, paymentStatus: "Pendiente", contractStatus: "Generado",     createdAt: "2026-05-02", updatedAt: "2026-05-02", notes: [] },
  { id: 3, promoter: "Bella Vista Living",clientId: 103, productId: "ascend",   repId: 2, stage: "Propuesta enviada", probability: 55, paymentStatus: "Pendiente", contractStatus: "Sin contrato", createdAt: "2026-05-03", updatedAt: "2026-05-03", notes: [] },
  { id: 4, promoter: "Banco Aliado",      clientId: 104, productId: "mortgage", repId: 3, stage: "Prospecto frío",   probability: 25, paymentStatus: "Pendiente", contractStatus: "Sin contrato", createdAt: "2026-05-04", updatedAt: "2026-05-04", notes: [] },
  { id: 5, promoter: "Costa Prime",       clientId: 105, productId: "lead",     repId: 1, stage: "Ganado", probability: 100, paymentStatus: "Pendiente", contractStatus: "Firmado",      createdAt: "2026-05-05", updatedAt: "2026-05-05", notes: [] },
];

// Payment records: { id, type: "rep_payout"|"client_charge", repId|clientId, oppId?, amount, currency, concept, status: "pending"|"processing"|"paid"|"failed", method, reference, createdAt, paidAt, week, month, year }
const INITIAL_PAYMENTS = [
  { id: "pay_001", type: "client_charge", clientId: 101, oppId: 1, repId: 1, amount: 399, currency: "USD", concept: "CROWN — Mayo 2026", status: "paid",    method: "stripe", reference: "ch_demo001", createdAt: "2026-05-01", paidAt: "2026-05-01", week: 18, month: "2026-05", year: 2026 },
  { id: "pay_002", type: "rep_payout",    repId: 1, oppId: 1, clientId: 101, amount: 199, currency: "USD", concept: "Comisión inicial CROWN — Grupo Urbana", status: "paid",    method: "transfer", reference: "po_demo001", createdAt: "2026-05-01", paidAt: "2026-05-03", week: 18, month: "2026-05", year: 2026 },
  { id: "pay_003", type: "client_charge", clientId: 102, oppId: 2, repId: 4, amount: 599, currency: "USD", concept: "HOME TAKEOVER — Mayo 2026", status: "pending", method: "stripe", reference: "", createdAt: "2026-05-02", paidAt: null, week: 18, month: "2026-05", year: 2026 },
  { id: "pay_004", type: "rep_payout",    repId: 4, oppId: 2, clientId: 102, amount: 329, currency: "USD", concept: "Comisión inicial HOME TAKEOVER — Pacific Dev.", status: "pending", method: "transfer", reference: "", createdAt: "2026-05-02", paidAt: null, week: 18, month: "2026-05", year: 2026 },
  { id: "pay_005", type: "client_charge", clientId: 105, oppId: 5, repId: 1, amount: 500, currency: "USD", concept: "LEAD BOOST — Mayo 2026", status: "pending", method: "stripe", reference: "", createdAt: "2026-05-05", paidAt: null, week: 19, month: "2026-05", year: 2026 },
  { id: "pay_006", type: "rep_payout",    repId: 1, oppId: 5, clientId: 105, amount: 250, currency: "USD", concept: "Comisión inicial LEAD BOOST — Costa Prime", status: "pending", method: "transfer", reference: "", createdAt: "2026-05-05", paidAt: null, week: 19, month: "2026-05", year: 2026 },
];

const STAGES = ["Prospecto frío","Reunión agendada","Propuesta enviada","Negociación","Cierre verbal","Ganado","Perdido"];
const PAYMENT_STATUSES = ["Pendiente","Pagado","Fallido","Cancelado"];
const CONTRACT_STATUSES = ["Sin contrato","Generado","Firmado"];
const ROLES = ["admin","manager","commercial"];
const STATUSES = ["Activo","En prueba","Pausado","Baja"];
const PAYMENT_METHODS = ["stripe","transfer","paypal","cash","other"];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const money  = v => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v||0);
const today  = () => new Date().toISOString().slice(0,10);
const monthKey  = d => String(d||today()).slice(0,7);
const addMonths = (d,n) => { const b=new Date(`${monthKey(d)}-01T00:00:00`); b.setMonth(b.getMonth()+n); return b.toISOString().slice(0,7); };
const prettyMonth = k => { const [y,m]=k.split("-"); return `${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][Number(m)-1]} ${y}`; };
const load   = (k,fb) => { try{ const r=localStorage.getItem(k); return r?JSON.parse(r):fb; }catch{ return fb; } };
const cleanPhone = v => String(v||"").replace(/[\s+\-()\t]/g,"");
const rankFromCount = n => { for(let i=RANKS.length-1;i>=0;i--) if(n>=RANKS[i].threshold) return RANKS[i]; return RANKS[0]; };
const rate   = (rep,key,fb) => Number(rep?.[key]??fb)/100;
const nowTs  = () => new Date().toLocaleString("es-PA",{dateStyle:"short",timeStyle:"short"});
const pct    = (a,b) => b?Math.round((a/b)*100):0;
const getWeek= d => { const dt=new Date(d); dt.setHours(0,0,0,0); dt.setDate(dt.getDate()+3-(dt.getDay()+6)%7); const w=new Date(dt.getFullYear(),0,4); return 1+Math.round(((dt-w)/86400000-3+(w.getDay()+6)%7)/7); };

function repStats(rep, opps) {
  const won   = opps.filter(o=>o.repId===rep.id&&o.stage==="Ganado");
  const paid  = won.filter(o=>o.paymentStatus==="Pagado");
  const pend  = won.filter(o=>o.paymentStatus==="Pendiente");
  const iRate = rate(rep,"initialCommissionPercent",50);
  const rRate = rate(rep,"recurringCommissionPercent",20);
  const calcPending = pend.reduce((s,o)=>s+product(o.productId).price*iRate,0);
  const calcMonthly = paid.reduce((s,o)=>s+product(o.productId).price*rRate,0);
  const pendingCollection = rep.pendingCollectionOverride!==""&&rep.pendingCollectionOverride!==undefined?Number(rep.pendingCollectionOverride):calcPending;
  const monthlyDue        = rep.monthlyDueOverride!==""&&rep.monthlyDueOverride!==undefined?Number(rep.monthlyDueOverride):calcMonthly;
  const total   = opps.filter(o=>o.repId===rep.id).length;
  const pipeline= opps.filter(o=>o.repId===rep.id&&!["Ganado","Perdido"].includes(o.stage)).length;
  return { won:won.length, paidClients:paid.length, pendingClients:pend.length,
           initialPaid:paid.reduce((s,o)=>s+product(o.productId).price*iRate,0),
           pendingCollection, monthlyDue, pipeline, total, closeRate:pct(won.length,total), rank:rankFromCount(won.length) };
}

function buildCashCalendar(opps,reps,monthsAhead=12){
  const start=monthKey(today());
  return Array.from({length:monthsAhead},(_,i)=>addMonths(start,i)).map(key=>{
    const rows=[]; let collected=0,forecast=0,recurring=0,pending=0;
    opps.forEach(opp=>{
      const p=product(opp.productId); const rep=reps.find(r=>r.id===opp.repId); const repName=rep?.name||"Sin comercial";
      const oppMonth=monthKey(opp.createdAt);
      if(opp.stage==="Ganado"&&opp.paymentStatus==="Pagado"&&key>=oppMonth){
        recurring+=p.price; if(key===monthKey(today())) collected+=p.price;
        rows.push({type:key===oppMonth?"Cobrado / Alta":"Recurrente previsto",client:opp.promoter,productName:p.name,repName,status:opp.paymentStatus,amount:p.price});
      }
      if(opp.stage==="Ganado"&&opp.paymentStatus==="Pendiente"&&key===oppMonth){
        pending+=p.price; forecast+=p.price;
        rows.push({type:"Pendiente de cobro",client:opp.promoter,productName:p.name,repName,status:opp.paymentStatus,amount:p.price});
      }
      if(!["Ganado","Perdido"].includes(opp.stage)&&key===oppMonth){
        const expected=p.price*(Number(opp.probability||0)/100);
        forecast+=expected; pending+=p.price;
        rows.push({type:"Previsto ponderado",client:opp.promoter,productName:p.name,repName,status:`${opp.probability}%`,amount:expected});
      }
    });
    return {month:key,collected,forecast,recurring,pending,totalExpected:recurring+forecast,rows};
  });
}

function contractFor(opp,reps){
  const p=product(opp.productId); const rep=reps.find(r=>r.id===opp.repId);
  return `CONTRATO COMERCIAL — INMOPROYECTOS PANAMÁ\n${"═".repeat(46)}\n\nDATOS DEL CLIENTE\nCliente / Promotora: ${opp.promoter}\nProducto contratado: ${p.name}\nPrecio mensual:      ${money(p.price)}\nFecha:               ${today()}\n\nRESPONSABLE COMERCIAL\nNombre:     ${rep?rep.name:"Sin asignar"}\nEmail:      ${rep?.email||"—"}\nTeléfono:   ${rep?.phone||"—"}\n\nCONDICIONES DE COMISIÓN\nComisión inicial:    ${rep?.initialCommissionPercent??50}% = ${money(p.price*(rep?.initialCommissionPercent??50)/100)}\nComisión mensual:    ${rep?.recurringCommissionPercent??20}% = ${money(p.price*(rep?.recurringCommissionPercent??20)/100)}/mes\n\nFIRMAS\nCliente: ____________________________  Fecha: __________\nInmoProyectos Panamá: _______________  Fecha: __________\n\n${"─".repeat(46)}\nDocumento generado automáticamente por CRM InmoProyectos Panamá.`;
}

function exportCSV(data,filename){
  if(!data.length) return;
  const keys=Object.keys(data[0]);
  const csv=[keys.join(","),...data.map(row=>keys.map(k=>`"${String(row[k]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=filename; a.click();
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function InmoProyectosCRM() {
  const [session,    setSession]    = useState(()=>load("ip_session",null));
  const [loginForm,  setLoginForm]  = useState({email:"admin@inmoproyectospanama.com",password:"admin123"});
  const [loginError, setLoginError] = useState("");
  const [tab,        setTab]        = useState("dashboard");
  const [reps,       setReps]       = useState(()=>load("ip_reps",   INITIAL_REPS));
  const [clients,    setClients]    = useState(()=>load("ip_clients", INITIAL_CLIENTS));
  const [opps,       setOpps]       = useState(()=>load("ip_opps",   INITIAL_OPPS));
  const [products,   setProducts]   = useState(()=>load("ip_products",INITIAL_PRODUCTS));
  const [payments,   setPayments]   = useState(()=>load("ip_payments",INITIAL_PAYMENTS));
  const [notifications, setNotifications] = useState([]);
  const [toast,      setToast]      = useState(null);
  const [confirm,    setConfirm]    = useState(null);
  const [processing, setProcessing] = useState(false);
  _products = products;

  // UI state
  const [pipelineFilters,setPipelineFilters] = useState({stage:"all",repId:"all",search:""});
  const [showOpp,    setShowOpp]    = useState(false);
  const [newOpp,     setNewOpp]     = useState({promoter:"",clientId:"",productId:"pulse",repId:1,stage:"Prospecto frío",probability:25,paymentStatus:"Pendiente",contractStatus:"Sin contrato"});
  const [expandedOppId,setExpandedOppId] = useState(null);
  const [noteInput,  setNoteInput]  = useState("");
  const [teamQuery,  setTeamQuery]  = useState("");
  const [selectedRepId,setSelectedRepId] = useState(1);
  const [showRep,    setShowRep]    = useState(false);
  const [editingRep, setEditingRep] = useState(null);
  const [editingClient,setEditingClient] = useState(null);
  const [showClient, setShowClient] = useState(false);
  const [newRep,     setNewRep]     = useState({name:"",lastName:"",phone:"",email:"",city:"",status:"Activo",role:"commercial",cargo:"",department:"Comercial",initialCommissionPercent:50,recurringCommissionPercent:20,bankName:"",bankIban:"",bankHolder:"",bankSwift:"",bankAccount:"",fiscalName:"",fiscalAddress:"",fiscalRuc:"",address:"",dni:"",ruc:"",linkedin:"",instagram:"",emergencyContact:"",emergencyPhone:"",notes:"",documents:[],hireDate:today(),pendingCollectionOverride:"",monthlyDueOverride:""});
  const [newClient,  setNewClient]  = useState({company:"",contactName:"",contactRole:"",phone:"",email:"",address:"",city:"",ruc:"",fiscalName:"",fiscalAddress:"",bankName:"",bankAccount:"",bankHolder:"",website:"",linkedin:"",instagram:"",notes:"",documents:[],createdAt:today(),stripeCustomerId:""});
  const [contractText,setContractText] = useState("");
  const [contractFilter,setContractFilter] = useState("all");
  const [selectedMonth,setSelectedMonth] = useState(monthKey(today()));
  const [payPeriod,  setPayPeriod]  = useState("month"); // week|month|year
  const [payType,    setPayType]    = useState("all");   // all|rep_payout|client_charge
  const [paySearch,  setPaySearch]  = useState("");
  const [clientTab,  setClientTab]  = useState("list"); // list|detail
  const [selectedClientId,setSelectedClientId] = useState(101);

  // Persist
  useEffect(()=>localStorage.setItem("ip_session",  JSON.stringify(session)),  [session]);
  useEffect(()=>localStorage.setItem("ip_reps",     JSON.stringify(reps)),     [reps]);
  useEffect(()=>localStorage.setItem("ip_clients",  JSON.stringify(clients)),  [clients]);
  useEffect(()=>localStorage.setItem("ip_opps",     JSON.stringify(opps)),     [opps]);
  useEffect(()=>localStorage.setItem("ip_products", JSON.stringify(products)), [products]);
  useEffect(()=>localStorage.setItem("ip_payments", JSON.stringify(payments)), [payments]);

  // Notifications
  useEffect(()=>{
    const notes=[];
    opps.forEach(opp=>{
      if(opp.stage==="Ganado"&&opp.paymentStatus==="Pendiente") notes.push({id:`pay-${opp.id}`,type:"warn",msg:`Cobro pendiente: ${opp.promoter} — ${money(product(opp.productId).price)}`});
      if(opp.stage==="Ganado"&&opp.contractStatus==="Sin contrato") notes.push({id:`con-${opp.id}`,type:"alert",msg:`Sin contrato firmado: ${opp.promoter}`});
      if(opp.stage==="Propuesta enviada"){const days=Math.floor((Date.now()-new Date(opp.createdAt))/86400000); if(days>=5) notes.push({id:`stale-${opp.id}`,type:"info",msg:`Propuesta sin respuesta (${days}d): ${opp.promoter}`});}
    });
    payments.filter(p=>p.status==="pending").forEach(p=>{
      const label=p.type==="rep_payout"?`Pago pendiente a ${reps.find(r=>r.id===p.repId)?.name||"comercial"}`:`Cobro pendiente de ${clients.find(c=>c.id===p.clientId)?.company||"cliente"}`;
      notes.push({id:`payment-${p.id}`,type:"warn",msg:`${label} — ${money(p.amount)}`});
    });
    setNotifications(notes);
  },[opps,payments,reps,clients]);

  const showToast = useCallback((msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),3400); },[]);
  const canAdmin  = session?.role==="admin";
  const canManage = session?.role==="admin"||session?.role==="manager";

  const enrichedReps = useMemo(()=>reps.map(rep=>({initialCommissionPercent:50,recurringCommissionPercent:20,...rep,stats:repStats({initialCommissionPercent:50,recurringCommissionPercent:20,...rep},opps)})),[reps,opps]);
  const selectedRep  = enrichedReps.find(r=>r.id===selectedRepId)||enrichedReps[0];
  const filteredReps = enrichedReps.filter(r=>`${r.name} ${r.city} ${r.role}`.toLowerCase().includes(teamQuery.toLowerCase()));
  const selectedClient = clients.find(c=>c.id===selectedClientId)||clients[0];

  const finance = useMemo(()=>{
    const paidWon=opps.filter(o=>o.stage==="Ganado"&&o.paymentStatus==="Pagado");
    const mrr=paidWon.reduce((s,o)=>s+product(o.productId).price,0);
    const monthlyDue=enrichedReps.reduce((s,r)=>s+r.stats.monthlyDue,0);
    const pipeline=opps.filter(o=>!["Ganado","Perdido"].includes(o.stage)).reduce((s,o)=>s+product(o.productId).price*(o.probability/100),0);
    return {paid:paidWon.length,pending:opps.filter(o=>o.stage==="Ganado"&&o.paymentStatus==="Pendiente").length,mrr,monthlyDue,initialPaid:enrichedReps.reduce((s,r)=>s+r.stats.initialPaid,0),pendingCollection:enrichedReps.reduce((s,r)=>s+r.stats.pendingCollection,0),bonus:enrichedReps.reduce((s,r)=>s+r.stats.rank.bonus,0),margin:mrr-monthlyDue,pipeline,totalOpps:opps.length,wonOpps:opps.filter(o=>o.stage==="Ganado").length,lostOpps:opps.filter(o=>o.stage==="Perdido").length};
  },[opps,enrichedReps]);

  const filteredOpps = useMemo(()=>{
    let list=opps;
    if(pipelineFilters.stage!=="all") list=list.filter(o=>o.stage===pipelineFilters.stage);
    if(pipelineFilters.repId!=="all") list=list.filter(o=>o.repId===Number(pipelineFilters.repId));
    if(pipelineFilters.search) list=list.filter(o=>`${o.promoter} ${product(o.productId).name}`.toLowerCase().includes(pipelineFilters.search.toLowerCase()));
    if(session?.role==="commercial"){const my=reps.find(r=>r.email===session.email); if(my) list=list.filter(o=>o.repId===my.id);}
    return list;
  },[opps,pipelineFilters,session,reps]);

  const funnel = useMemo(()=>STAGES.map(s=>({stage:s,count:opps.filter(o=>o.stage===s).length,value:opps.filter(o=>o.stage===s).reduce((s,o)=>s+product(o.productId).price,0)})),[opps]);

  // Payment helpers
  const filteredPayments = useMemo(()=>{
    const now=new Date(); const curWeek=getWeek(today()); const curMonth=monthKey(today()); const curYear=now.getFullYear();
    let list=payments;
    if(payPeriod==="week")  list=list.filter(p=>p.week===curWeek&&p.year===curYear);
    if(payPeriod==="month") list=list.filter(p=>p.month===curMonth);
    if(payPeriod==="year")  list=list.filter(p=>p.year===curYear);
    if(payType!=="all")     list=list.filter(p=>p.type===payType);
    if(paySearch) list=list.filter(p=>p.concept.toLowerCase().includes(paySearch.toLowerCase())||(reps.find(r=>r.id===p.repId)?.name||"").toLowerCase().includes(paySearch.toLowerCase())||(clients.find(c=>c.id===p.clientId)?.company||"").toLowerCase().includes(paySearch.toLowerCase()));
    return list;
  },[payments,payPeriod,payType,paySearch,reps,clients]);

  const paymentSummary = useMemo(()=>{
    const charges=filteredPayments.filter(p=>p.type==="client_charge");
    const payouts=filteredPayments.filter(p=>p.type==="rep_payout");
    return {
      totalCharged:  charges.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0),
      pendingCharge: charges.filter(p=>p.status==="pending").reduce((s,p)=>s+p.amount,0),
      totalPaidOut:  payouts.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0),
      pendingPayout: payouts.filter(p=>p.status==="pending").reduce((s,p)=>s+p.amount,0),
    };
  },[filteredPayments]);

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  function login(){ const u=USERS.find(u=>u.email===loginForm.email&&u.password===loginForm.password); if(!u){setLoginError("Credenciales incorrectas.");return;} setSession({name:u.name,email:u.email,role:u.role}); }
  function logout(){ setSession(null); localStorage.removeItem("ip_session"); }

  function saveRep(rep){ setReps(p=>p.map(r=>r.id===rep.id?{...rep,phone:cleanPhone(rep.phone)}:r)); setEditingRep(null); showToast("Comercial actualizado"); }
  function createRep(){ if(!newRep.name.trim()) return; const r={...newRep,id:Date.now(),phone:cleanPhone(newRep.phone)}; setReps(p=>[...p,r]); setSelectedRepId(r.id); setShowRep(false); setNewRep({name:"",lastName:"",phone:"",email:"",city:"",status:"Activo",role:"commercial",cargo:"",department:"Comercial",initialCommissionPercent:50,recurringCommissionPercent:20,bankName:"",bankIban:"",bankHolder:"",bankSwift:"",bankAccount:"",fiscalName:"",fiscalAddress:"",fiscalRuc:"",address:"",dni:"",ruc:"",linkedin:"",instagram:"",emergencyContact:"",emergencyPhone:"",notes:"",documents:[],hireDate:today(),pendingCollectionOverride:"",monthlyDueOverride:""}); showToast("Comercial creado"); }
  function deleteRep(id){ setConfirm({message:"¿Eliminar este comercial? Sus oportunidades quedarán sin asignar.",onOk:()=>{ setReps(p=>p.filter(r=>r.id!==id)); setOpps(p=>p.map(o=>o.repId===id?{...o,repId:null}:o)); showToast("Comercial eliminado","warn"); }}); }

  function saveClient(cl){ setClients(p=>p.map(c=>c.id===cl.id?cl:c)); setEditingClient(null); showToast("Cliente actualizado"); }
  function createClient(){ if(!newClient.company.trim()) return; const c={...newClient,id:Date.now()}; setClients(p=>[...p,c]); setSelectedClientId(c.id); setShowClient(false); setNewClient({company:"",contactName:"",contactRole:"",phone:"",email:"",address:"",city:"",ruc:"",fiscalName:"",fiscalAddress:"",bankName:"",bankAccount:"",bankHolder:"",website:"",linkedin:"",instagram:"",notes:"",documents:[],createdAt:today(),stripeCustomerId:""}); showToast("Cliente creado"); }
  function deleteClient(id){ setConfirm({message:"¿Eliminar este cliente?",onOk:()=>{ setClients(p=>p.filter(c=>c.id!==id)); showToast("Cliente eliminado","warn"); }}); }

  function createOpp(){ if(!newOpp.promoter.trim()) return; setOpps(p=>[...p,{...newOpp,id:Date.now(),createdAt:today(),updatedAt:today(),notes:[]}]); setShowOpp(false); showToast("Oportunidad creada"); }
  function updateOpp(id,changes){ setOpps(p=>p.map(o=>o.id===id?{...o,...changes,updatedAt:today()}:o)); }
  function deleteOpp(id){ setConfirm({message:"¿Eliminar esta oportunidad?",onOk:()=>{ setOpps(p=>p.filter(o=>o.id!==id)); showToast("Oportunidad eliminada","warn"); }}); }
  function markPaid(opp){ updateOpp(opp.id,{stage:"Ganado",probability:100,paymentStatus:"Pagado"}); showToast(`${opp.promoter} marcado como pagado`); }
  function generateContract(opp){ updateOpp(opp.id,{contractStatus:"Generado"}); setContractText(contractFor(opp,reps)); setTab("contracts"); showToast("Contrato generado"); }
  function addNote(oppId){ if(!noteInput.trim()) return; const note={text:noteInput.trim(),ts:nowTs(),author:session?.name||"Sistema"}; setOpps(p=>p.map(o=>o.id===oppId?{...o,notes:[...(o.notes||[]),note],updatedAt:today()}:o)); setNoteInput(""); showToast("Nota añadida"); }
  function downloadContract(){ if(!contractText) return; const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([contractText],{type:"text/plain"})); a.download="contrato_inmoproyectos.txt"; a.click(); }
  function updateProduct(id,field,value){ setProducts(p=>p.map(pr=>pr.id===id?{...pr,[field]:field==="price"?(value===""?0:Number(value)):value}:pr)); }
  function resetDemo(){ setConfirm({message:"¿Resetear todos los datos demo?",onOk:()=>{ setReps(INITIAL_REPS); setOpps(INITIAL_OPPS); setClients(INITIAL_CLIENTS); setPayments(INITIAL_PAYMENTS); setProducts(INITIAL_PRODUCTS); setSelectedRepId(1); showToast("Demo reseteado"); }}); }
  function waUrl(opp){ const rep=reps.find(r=>r.id===opp.repId); const phone=cleanPhone(rep?.phone||"50765385600"); return `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, soy de InmoProyectos Panamá. Le escribo sobre ${product(opp.productId).name} para ${opp.promoter}.`)}`; }

  // Payment actions
  async function executeClientCharge(paymentId){
    const pay=payments.find(p=>p.id===paymentId); if(!pay) return;
    const client=clients.find(c=>c.id===pay.clientId);
    setProcessing(true);
    try{
      const res=await processStripeCharge({amount:pay.amount*100,description:pay.concept,clientEmail:client?.email,metadata:{paymentId,clientId:pay.clientId,oppId:pay.oppId}});
      if(res.success){
        setPayments(p=>p.map(pm=>pm.id===paymentId?{...pm,status:"paid",reference:res.chargeId,paidAt:today()}:pm));
        if(pay.oppId) updateOpp(pay.oppId,{paymentStatus:"Pagado"});
        showToast(`Cobro de ${money(pay.amount)} procesado`);
      }
    }catch(e){ showToast("Error al procesar cobro","error"); }
    setProcessing(false);
  }

  async function executeRepPayout(paymentId){
    const pay=payments.find(p=>p.id===paymentId); if(!pay) return;
    const rep=reps.find(r=>r.id===pay.repId);
    if(!rep?.bankAccount&&!rep?.bankIban){ showToast("El comercial no tiene datos bancarios configurados","warn"); return; }
    setProcessing(true);
    try{
      const res=await processStripePayout({amount:pay.amount*100,repName:rep.name,bankAccount:rep.bankAccount||rep.bankIban,description:pay.concept});
      if(res.success){
        setPayments(p=>p.map(pm=>pm.id===paymentId?{...pm,status:"paid",reference:res.payoutId,paidAt:today()}:pm));
        showToast(`Pago de ${money(pay.amount)} enviado a ${rep.name}`);
      }
    }catch(e){ showToast("Error al procesar pago","error"); }
    setProcessing(false);
  }

  function createPaymentFromOpp(opp, type){
    const p=product(opp.productId); const rep=reps.find(r=>r.id===opp.repId);
    const iRate=rate(rep||{},"initialCommissionPercent",50);
    const amount=type==="client_charge"?p.price:p.price*iRate;
    const concept=type==="client_charge"?`${p.name} — ${prettyMonth(monthKey(today()))}`:`Comisión inicial ${p.name} — ${opp.promoter}`;
    const newPay={id:"pay_"+Date.now(),type,clientId:opp.clientId,repId:opp.repId,oppId:opp.id,amount:Math.round(amount),currency:"USD",concept,status:"pending",method:type==="client_charge"?"stripe":"transfer",reference:"",createdAt:today(),paidAt:null,week:getWeek(today()),month:monthKey(today()),year:new Date().getFullYear()};
    setPayments(p=>[...p,newPay]);
    showToast(`Pago creado: ${money(Math.round(amount))}`);
  }

  function markPaymentManual(paymentId){
    setPayments(p=>p.map(pm=>pm.id===paymentId?{...pm,status:"paid",paidAt:today(),reference:"manual"}:pm));
    showToast("Marcado como pagado manualmente");
  }

  function deletePayment(id){ setConfirm({message:"¿Eliminar este registro de pago?",onOk:()=>{ setPayments(p=>p.filter(pm=>pm.id!==id)); showToast("Pago eliminado","warn"); }}); }

  if(!session) return <Login loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} login={login}/>;

  const TABS=[["dashboard","Dashboard"],["team","Equipo"],["clients","Clientes"],["pipeline","Pipeline"],["funnel","Embudo"],["payments","Pagos"],["contracts","Contratos"],["finance","Cobros"],["calendar","Calendario"],["admin","Admin"]];

  return(
  <div className="app">
    <Styles/>
    {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    {confirm && <ConfirmDialog {...confirm} onCancel={()=>setConfirm(null)} onOk={()=>{confirm.onOk();setConfirm(null);}}/>}
    {processing && <div className="processingOverlay"><div className="processingSpinner"/><div className="processingText">Procesando pago…</div></div>}

    <header className="header">
      <div className="wrap headerInner">
        <div className="brand"><div className="brandMark">IP</div><div><div className="brandTitle">INMOPROYECTOS</div><div className="brandSub">Commercial SaaS CRM</div></div></div>
        <nav className="tabs">
          {TABS.map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} className={tab===id?"active":""}>
              {label}
              {id==="dashboard"&&notifications.length>0&&<span className="badge">{notifications.length}</span>}
              {id==="payments"&&payments.filter(p=>p.status==="pending").length>0&&<span className="badge">{payments.filter(p=>p.status==="pending").length}</span>}
            </button>
          ))}
        </nav>
        <div className="sessionBox"><span>{session.name}</span><b>{session.role}</b><button onClick={logout}>Salir</button></div>
      </div>
    </header>

    <main className="wrap main">
      {showRep    && <RepModal    rep={newRep}    setRep={setNewRep}    onCancel={()=>setShowRep(false)}    onSave={createRep}    canAdmin={canAdmin} title="Nuevo comercial"/>}
      {editingRep && <RepModal    rep={editingRep} setRep={setEditingRep} onCancel={()=>setEditingRep(null)} onSave={()=>saveRep(editingRep)} canAdmin={canAdmin} title="Editar comercial"/>}
      {showClient    && <ClientModal client={newClient}    setClient={setNewClient}    onCancel={()=>setShowClient(false)}      onSave={createClient} title="Nuevo cliente"/>}
      {editingClient && <ClientModal client={editingClient} setClient={setEditingClient} onCancel={()=>setEditingClient(null)} onSave={()=>saveClient(editingClient)} title="Editar cliente"/>}
      {showOpp && <OppModal reps={reps} clients={clients} newOpp={newOpp} setNewOpp={setNewOpp} onCancel={()=>setShowOpp(false)} onSave={createOpp}/>}

      {tab==="dashboard" && <Dashboard finance={finance} notifications={notifications} reps={filteredReps} selectedRep={selectedRep} setSelectedRepId={setSelectedRepId} teamQuery={teamQuery} setTeamQuery={setTeamQuery} onEditRep={setEditingRep} products={products} payments={payments} clients={clients}/>}
      {tab==="team"      && <TeamTab reps={filteredReps} selectedRep={selectedRep} setSelectedRepId={setSelectedRepId} teamQuery={teamQuery} setTeamQuery={setTeamQuery} onEdit={setEditingRep} onDelete={canAdmin?deleteRep:null} canManage={canManage} onNew={()=>setShowRep(true)} payments={payments}/>}
      {tab==="clients"   && <ClientsTab clients={clients} opps={opps} payments={payments} reps={reps} selectedClient={selectedClient} setSelectedClientId={id=>{setSelectedClientId(id);setClientTab("detail");}} clientTab={clientTab} setClientTab={setClientTab} onEdit={setEditingClient} onDelete={canAdmin?deleteClient:null} canManage={canManage} onNew={()=>setShowClient(true)} onCreateCharge={createPaymentFromOpp} onExecuteCharge={executeClientCharge}/>}
      {tab==="pipeline"  && <Pipeline opps={filteredOpps} reps={reps} clients={clients} filters={pipelineFilters} setFilters={setPipelineFilters} updateOpp={updateOpp} deleteOpp={deleteOpp} generateContract={generateContract} markPaid={markPaid} waUrl={waUrl} canManage={canManage} setShowOpp={setShowOpp} expandedOppId={expandedOppId} setExpandedOppId={setExpandedOppId} noteInput={noteInput} setNoteInput={setNoteInput} addNote={addNote} session={session} onCreatePayment={createPaymentFromOpp} onExport={()=>exportCSV(filteredOpps.map(o=>({promoter:o.promoter,product:product(o.productId).name,stage:o.stage,probability:o.probability,payment:o.paymentStatus,value:product(o.productId).price,rep:reps.find(r=>r.id===o.repId)?.name||"",date:o.createdAt})),"pipeline.csv")}/>}
      {tab==="funnel"    && <Funnel funnel={funnel} opps={opps} reps={reps}/>}
      {tab==="payments"  && <PaymentsTab payments={filteredPayments} allPayments={payments} reps={reps} clients={clients} summary={paymentSummary} payPeriod={payPeriod} setPayPeriod={setPayPeriod} payType={payType} setPayType={setPayType} paySearch={paySearch} setPaySearch={setPaySearch} onExecuteCharge={executeClientCharge} onExecutePayout={executeRepPayout} onMarkManual={markPaymentManual} onDelete={deletePayment} processing={processing} onExport={()=>exportCSV(filteredPayments.map(p=>({id:p.id,type:p.type,concept:p.concept,amount:p.amount,currency:p.currency,status:p.status,method:p.method,reference:p.reference,createdAt:p.createdAt,paidAt:p.paidAt||""})),"pagos.csv")}/>}
      {tab==="contracts" && <Contracts opps={opps} reps={reps} updateOpp={updateOpp} generateContract={generateContract} contractText={contractText} setContractText={setContractText} contractFilter={contractFilter} setContractFilter={setContractFilter} downloadContract={downloadContract} onExport={()=>exportCSV(opps.map(o=>({promoter:o.promoter,product:product(o.productId).name,contract:o.contractStatus,payment:o.paymentStatus,stage:o.stage})),"contratos.csv")}/>}
      {tab==="finance"   && <Finance finance={finance} reps={enrichedReps} onExport={()=>exportCSV(enrichedReps.map(r=>({name:r.name,city:r.city,role:r.role,initialPct:r.initialCommissionPercent,recurringPct:r.recurringCommissionPercent,pending:r.stats.pendingCollection,monthly:r.stats.monthlyDue,bonus:r.stats.rank.bonus,rank:r.stats.rank.name})),"cobros.csv")}/>}
      {tab==="calendar"  && <CashCalendar opps={opps} reps={reps} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}/>}
      {tab==="admin"     && <Admin canAdmin={canAdmin} reps={reps} setReps={setReps} products={products} updateProduct={updateProduct} resetDemo={resetDemo}/>}
    </main>
  </div>);
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({finance,notifications,reps,selectedRep,setSelectedRepId,teamQuery,setTeamQuery,onEditRep,products,payments,clients}){
  const pendingPayouts  = payments.filter(p=>p.type==="rep_payout" &&p.status==="pending").reduce((s,p)=>s+p.amount,0);
  const pendingCharges  = payments.filter(p=>p.type==="client_charge"&&p.status==="pending").reduce((s,p)=>s+p.amount,0);
  return(<>
    {notifications.length>0&&<div className="notifBar">{notifications.slice(0,3).map(n=><div key={n.id} className={`notif notif-${n.type}`}>{n.msg}</div>)}{notifications.length>3&&<div className="notif notif-info">+{notifications.length-3} alertas más</div>}</div>}
    <section className="grid4">
      <Kpi label="MRR" value={money(finance.mrr)} sub="ingresos recurrentes" icon="↑"/>
      <Kpi label="Cobros pendientes" value={money(pendingCharges)} sub="de clientes" icon="!" warn/>
      <Kpi label="Pagos a comerciales" value={money(pendingPayouts)} sub="por liquidar" icon="⟳" warn/>
      <Kpi label="Pipeline ponderado" value={money(finance.pipeline)} sub={`${finance.totalOpps-finance.wonOpps-finance.lostOpps} opp. activas`} icon="◎"/>
    </section>
    <section className="grid2" style={{marginTop:24}}>
      <TeamCard reps={reps} selectedRep={selectedRep} setSelectedRepId={setSelectedRepId} query={teamQuery} setQuery={setTeamQuery} onEdit={onEditRep}/>
      <RepDetail rep={selectedRep} onEdit={onEditRep}/>
    </section>
    <Catalog products={products}/>
  </>);
}

// ─── TEAM TAB ─────────────────────────────────────────────────────────────────
function TeamTab({reps,selectedRep,setSelectedRepId,teamQuery,setTeamQuery,onEdit,onDelete,canManage,onNew,payments}){
  return(<section>
    <Top title="Equipo comercial." eyebrow="Gestión de comerciales">{canManage&&<Btn onClick={onNew}>+ Nuevo comercial</Btn>}</Top>
    <Card><div className="cardContent"><TeamCard reps={reps} selectedRep={selectedRep} setSelectedRepId={setSelectedRepId} query={teamQuery} setQuery={setTeamQuery} onEdit={onEdit} onDelete={onDelete} embedded/></div></Card>
    {selectedRep&&<RepDetail rep={selectedRep} onEdit={onEdit} payments={payments} style={{marginTop:20}}/>}
  </section>);
}

function TeamCard({reps,selectedRep,setSelectedRepId,query,setQuery,onEdit,onDelete,embedded}){
  return(<div className={embedded?"":"card"}><div className={embedded?"":"cardContent"}>
    <div className="topLine">
      {!embedded&&<div><div className="eyebrow eyebrowBlue">Equipo</div><h1 className="title">Controla quién vende.</h1></div>}
      <div className="search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar comercial..."/></div>
    </div>
    <div className="tableScroll"><table>
      <thead><tr><th>Comercial</th><th>Rango</th><th className="right">Cerrados</th><th className="right">Inicial%</th><th className="right">Mensual%</th><th className="right">Pendiente</th><th className="right">Mensual</th><th></th></tr></thead>
      <tbody>{reps.map(rep=>(
        <tr key={rep.id} onClick={()=>setSelectedRepId(rep.id)} className={selectedRep?.id===rep.id?"selectedRow":""}>
          <td><div className="repName">{rep.name} {rep.lastName||""}</div><div className="repMeta">{rep.city} · {rep.status} · {rep.cargo||rep.role}</div></td>
          <td><RankBadge rank={rep.stats.rank}/></td>
          <td className="right strong">{rep.stats.won}</td>
          <td className="right strong">{rep.initialCommissionPercent}%</td>
          <td className="right strong">{rep.recurringCommissionPercent}%</td>
          <td className="right pendingMoney">{money(rep.stats.pendingCollection)}</td>
          <td className="right moneyGreen">{money(rep.stats.monthlyDue)}</td>
          <td><div className="rowActions"><button className="miniBtn" onClick={e=>{e.stopPropagation();onEdit(rep);}}>Editar</button>{onDelete&&<button className="miniBtn miniBtnDanger" onClick={e=>{e.stopPropagation();onDelete(rep.id);}}>Borrar</button>}</div></td>
        </tr>
      ))}</tbody>
    </table></div>
  </div></div>);
}

function RepDetail({rep,onEdit,payments=[]}){
  if(!rep) return null;
  const next=RANKS.find(r=>r.threshold>rep.stats.won);
  const progress=next?Math.min(100,(rep.stats.won/next.threshold)*100):100;
  const repPayments=payments.filter(p=>p.repId===rep.id);
  const totalPaid=repPayments.filter(p=>p.status==="paid"&&p.type==="rep_payout").reduce((s,p)=>s+p.amount,0);
  const totalPending=repPayments.filter(p=>p.status==="pending"&&p.type==="rep_payout").reduce((s,p)=>s+p.amount,0);
  return(<Card className="cardDark">
    <div className="cardContent">
      <div className="topLine">
        <div>
          <div className="eyebrow eyebrowOrange">Ficha comercial</div>
          <h2 className="title titleDark">{rep.name} {rep.lastName||""}</h2>
          <div className="contact">{rep.phone} · {rep.email}</div>
          {rep.cargo&&<div className="contact" style={{marginTop:4}}>{rep.cargo} · {rep.department||""}</div>}
        </div>
        <button className="editLight" onClick={()=>onEdit(rep)}>Editar ficha</button>
      </div>
      <div className="statsGrid">
        <Dark label="Inicial pagado"    value={money(rep.stats.initialPaid)}/>
        <Dark label="Pendiente cobro"   value={money(rep.stats.pendingCollection)} warn/>
        <Dark label="Cobro mensual"     value={money(rep.stats.monthlyDue)} green/>
        <Dark label="Ratio cierre"      value={`${rep.stats.closeRate}%`}/>
      </div>
      <div className="statsGrid" style={{marginTop:10}}>
        <Dark label="Ganados"           value={rep.stats.won}/>
        <Dark label="En pipeline"       value={rep.stats.pipeline}/>
        <Dark label="Total pagado"      value={money(totalPaid)} green/>
        <Dark label="Pend. liquidación" value={money(totalPending)} warn/>
      </div>
      {rep.bankName&&<div className="bankChip"><span className="bankIcon">🏦</span><span>{rep.bankName} · {rep.bankAccount||rep.bankIban||"—"}</span></div>}
      <div className="unlock">
        <div className="eyebrow eyebrowOrange">Siguiente: {next?next.name:"Máximo rango"}</div>
        <div className="progress"><div className="progressFill" style={{width:`${progress}%`}}/></div>
        <div className="smallText">{next?`${rep.stats.won} / ${next.threshold} · bonus ${money(next.bonus)}`:`Bonus máximo: ${money(rep.stats.rank.bonus)}`}</div>
      </div>
    </div>
  </Card>);
}

// ─── CLIENTS TAB ──────────────────────────────────────────────────────────────
function ClientsTab({clients,opps,payments,reps,selectedClient,setSelectedClientId,clientTab,setClientTab,onEdit,onDelete,canManage,onNew}){
  return(<section>
    <Top title="Clientes y cobros." eyebrow="Gestión de clientes">
      <div className="topBtns">
        <Btn small onClick={()=>setClientTab("list")} variant={clientTab==="list"?"dark":"ghost"}>Lista</Btn>
        <Btn small onClick={()=>setClientTab("detail")} variant={clientTab==="detail"?"dark":"ghost"}>Ficha</Btn>
        {canManage&&<Btn onClick={onNew}>+ Nuevo cliente</Btn>}
      </div>
    </Top>
    {clientTab==="list"&&<ClientList clients={clients} selectedClient={selectedClient} setSelectedClientId={setSelectedClientId} onEdit={onEdit} onDelete={onDelete} opps={opps} payments={payments}/>}
    {clientTab==="detail"&&selectedClient&&<ClientDetail client={selectedClient} opps={opps} payments={payments} reps={reps} onEdit={onEdit}/>}
  </section>);
}

function ClientList({clients,selectedClient,setSelectedClientId,onEdit,onDelete,opps,payments}){
  const [search,setSearch]=useState("");
  const filtered=clients.filter(c=>`${c.company} ${c.contactName} ${c.city}`.toLowerCase().includes(search.toLowerCase()));
  return(<Card><div className="cardContent">
    <div className="topLine" style={{marginBottom:16}}>
      <div className="eyebrow eyebrowBlue">Clientes registrados ({clients.length})</div>
      <div className="search"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..."/></div>
    </div>
    <div className="tableScroll"><table>
      <thead><tr><th>Empresa</th><th>Contacto</th><th>Ciudad</th><th className="right">Deals</th><th className="right">Cobrado</th><th className="right">Pendiente</th><th></th></tr></thead>
      <tbody>{filtered.map(c=>{
        const cOpps=opps.filter(o=>o.clientId===c.id);
        const charged=payments.filter(p=>p.clientId===c.id&&p.type==="client_charge"&&p.status==="paid").reduce((s,p)=>s+p.amount,0);
        const pending=payments.filter(p=>p.clientId===c.id&&p.type==="client_charge"&&p.status==="pending").reduce((s,p)=>s+p.amount,0);
        return(<tr key={c.id} onClick={()=>setSelectedClientId(c.id)} className={selectedClient?.id===c.id?"selectedRow":""}>
          <td><div className="repName">{c.company}</div><div className="repMeta">{c.email}</div></td>
          <td><div>{c.contactName}</div><div className="repMeta">{c.contactRole}</div></td>
          <td>{c.city}</td>
          <td className="right">{cOpps.length}</td>
          <td className="right moneyGreen">{money(charged)}</td>
          <td className="right pendingMoney">{money(pending)}</td>
          <td><div className="rowActions">
            <button className="miniBtn" onClick={e=>{e.stopPropagation();onEdit(c);}}>Editar</button>
            {onDelete&&<button className="miniBtn miniBtnDanger" onClick={e=>{e.stopPropagation();onDelete(c.id);}}>Borrar</button>}
          </div></td>
        </tr>);
      })}</tbody>
    </table></div>
  </div></Card>);
}

function ClientDetail({client,opps,payments,reps,onEdit}){
  const cOpps=opps.filter(o=>o.clientId===client.id);
  const cPayments=payments.filter(p=>p.clientId===client.id);
  const totalCharged=cPayments.filter(p=>p.status==="paid"&&p.type==="client_charge").reduce((s,p)=>s+p.amount,0);
  const totalPending=cPayments.filter(p=>p.status==="pending"&&p.type==="client_charge").reduce((s,p)=>s+p.amount,0);
  return(<div className="grid2" style={{marginTop:0}}>
    <Card className="cardDark"><div className="cardContent">
      <div className="topLine"><div>
        <div className="eyebrow eyebrowOrange">Ficha cliente</div>
        <h2 className="title titleDark">{client.company}</h2>
        <div className="contact">{client.contactName} · {client.contactRole}</div>
        <div className="contact" style={{marginTop:4}}>{client.phone} · {client.email}</div>
      </div><button className="editLight" onClick={()=>onEdit(client)}>Editar</button></div>
      <div className="statsGrid">
        <Dark label="Deals activos"   value={cOpps.filter(o=>!["Ganado","Perdido"].includes(o.stage)).length}/>
        <Dark label="Deals ganados"   value={cOpps.filter(o=>o.stage==="Ganado").length}/>
        <Dark label="Total cobrado"   value={money(totalCharged)} green/>
        <Dark label="Pendiente cobro" value={money(totalPending)} warn/>
      </div>
      {client.fiscalName&&<div className="bankChip"><span>🧾</span><span>{client.fiscalName} · RUC {client.ruc||"—"}</span></div>}
      {client.bankName&&<div className="bankChip"><span>🏦</span><span>{client.bankName} · {client.bankAccount||"—"}</span></div>}
      {client.stripeCustomerId&&<div className="bankChip"><span>💳</span><span>Stripe: {client.stripeCustomerId}</span></div>}
      {client.notes&&<div className="clientNotes">{client.notes}</div>}
    </div></Card>
    <div>
      <Card style={{marginBottom:16}}><div className="cardContent">
        <div className="eyebrow eyebrowBlue" style={{marginBottom:12}}>Historial de cobros</div>
        {cPayments.length===0&&<div className="muted">Sin cobros registrados.</div>}
        {cPayments.slice(-8).reverse().map(p=>(
          <div key={p.id} className="payRow">
            <div><div className="payRowConcept">{p.concept}</div><div className="payRowMeta">{p.createdAt} · {p.method}</div></div>
            <div className="payRowRight"><div className="payRowAmount">{money(p.amount)}</div><StatusBadge status={p.status}/></div>
          </div>
        ))}
      </div></Card>
      <Card><div className="cardContent">
        <div className="eyebrow eyebrowBlue" style={{marginBottom:12}}>Oportunidades</div>
        {cOpps.map(o=><div key={o.id} className="payRow"><div><div className="payRowConcept">{o.promoter} · {product(o.productId).name}</div><div className="payRowMeta">{o.stage} · {o.createdAt}</div></div><StatusBadge status={o.paymentStatus==="Pagado"?"paid":o.paymentStatus==="Pendiente"?"pending":"failed"}/></div>)}
      </div></Card>
    </div>
  </div>);
}

// ─── PAYMENTS TAB ─────────────────────────────────────────────────────────────
function PaymentsTab({payments,allPayments,reps,clients,summary,payPeriod,setPayPeriod,payType,setPayType,paySearch,setPaySearch,onExecuteCharge,onExecutePayout,onMarkManual,onDelete,processing,onExport}){
  return(<section>
    <Top title="Pagos y cobros." eyebrow="Control de pagos">
      <div className="topBtns">
        <Btn small onClick={onExport}>Exportar CSV</Btn>
      </div>
    </Top>

    {/* Period toggle */}
    <div className="periodBar">
      {[["week","Esta semana"],["month","Este mes"],["year","Este año"],["all","Todos"]].map(([v,l])=>(
        <button key={v} className={`periodBtn ${payPeriod===v?"periodActive":""}`} onClick={()=>setPayPeriod(v)}>{l}</button>
      ))}
    </div>

    {/* Summary KPIs */}
    <section className="grid4" style={{marginBottom:24}}>
      <Kpi label="Cobrado a clientes"   value={money(summary.totalCharged)}  sub="confirmado" icon="✓" green/>
      <Kpi label="Pendiente clientes"   value={money(summary.pendingCharge)}  sub="por cobrar"  icon="!" warn/>
      <Kpi label="Pagado a comerciales" value={money(summary.totalPaidOut)}   sub="liquidado"  icon="✓" green/>
      <Kpi label="Pendiente comerciales"value={money(summary.pendingPayout)}  sub="por pagar"  icon="⟳" warn/>
    </section>

    {/* Filters */}
    <div className="pipelineFiltersBar">
      <input className="pipelineSearch" value={paySearch} onChange={e=>setPaySearch(e.target.value)} placeholder="Buscar concepto, cliente o comercial..."/>
      <select value={payType} onChange={e=>setPayType(e.target.value)}>
        <option value="all">Todos los tipos</option>
        <option value="client_charge">Cobros a clientes</option>
        <option value="rep_payout">Pagos a comerciales</option>
      </select>
    </div>

    {/* Payments by type */}
    <div className="grid2" style={{marginTop:0}}>
      <div>
        <div className="sectionLabel">Cobros a clientes</div>
        {payments.filter(p=>p.type==="client_charge").length===0&&<Card><div className="cardContent muted">Sin cobros en este período.</div></Card>}
        {payments.filter(p=>p.type==="client_charge").map(p=><PaymentCard key={p.id} payment={p} reps={reps} clients={clients} onExecuteCharge={onExecuteCharge} onExecutePayout={onExecutePayout} onMarkManual={onMarkManual} onDelete={onDelete} processing={processing}/>)}
      </div>
      <div>
        <div className="sectionLabel">Pagos a comerciales</div>
        {payments.filter(p=>p.type==="rep_payout").length===0&&<Card><div className="cardContent muted">Sin pagos en este período.</div></Card>}
        {payments.filter(p=>p.type==="rep_payout").map(p=><PaymentCard key={p.id} payment={p} reps={reps} clients={clients} onExecuteCharge={onExecuteCharge} onExecutePayout={onExecutePayout} onMarkManual={onMarkManual} onDelete={onDelete} processing={processing}/>)}
      </div>
    </div>

    {/* Rep payment summary table */}
    <Card style={{marginTop:24}}><div className="cardContent">
      <div className="eyebrow eyebrowBlue" style={{marginBottom:16}}>Resumen por comercial — {payPeriod==="week"?"Esta semana":payPeriod==="month"?"Este mes":payPeriod==="year"?"Este año":"Total"}</div>
      <div className="tableScroll"><table>
        <thead><tr><th>Comercial</th><th>Banco</th><th className="right">Cobros generados</th><th className="right">Pagado</th><th className="right">Pendiente</th></tr></thead>
        <tbody>{reps.map(rep=>{
          const rp=allPayments.filter(p=>p.repId===rep.id&&p.type==="rep_payout");
          const paid=rp.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0);
          const pend=rp.filter(p=>p.status==="pending").reduce((s,p)=>s+p.amount,0);
          const charges=allPayments.filter(p=>p.repId===rep.id&&p.type==="client_charge").reduce((s,p)=>s+p.amount,0);
          return(<tr key={rep.id}>
            <td><div className="repName">{rep.name}</div><div className="repMeta">{rep.bankName||"Sin banco"}</div></td>
            <td><div className="repMeta">{rep.bankAccount||rep.bankIban||"—"}</div></td>
            <td className="right">{money(charges)}</td>
            <td className="right moneyGreen">{money(paid)}</td>
            <td className="right pendingMoney">{money(pend)}</td>
          </tr>);
        })}</tbody>
      </table></div>
    </div></Card>
  </section>);
}

function PaymentCard({payment,reps,clients,onExecuteCharge,onExecutePayout,onMarkManual,onDelete,processing}){
  const rep=reps.find(r=>r.id===payment.repId);
  const client=clients.find(c=>c.id===payment.clientId);
  const isCharge=payment.type==="client_charge";
  return(<Card style={{marginBottom:12}}><div style={{padding:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
      <div>
        <div className="payRowConcept">{payment.concept}</div>
        <div className="payRowMeta">
          {isCharge?`Cliente: ${client?.company||"—"}`:`Comercial: ${rep?.name||"—"}`} · {payment.createdAt} · {payment.method}
          {payment.reference&&<span style={{marginLeft:8,color:"#18a058"}}>Ref: {payment.reference}</span>}
        </div>
        {!isCharge&&rep?.bankName&&<div className="repMeta" style={{marginTop:4}}>🏦 {rep.bankName} · {rep.bankAccount||rep.bankIban||"—"}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:"-.04em"}}>{money(payment.amount)}</div>
        <StatusBadge status={payment.status}/>
      </div>
    </div>
    {payment.status==="pending"&&(
      <div className="quickActions" style={{marginTop:12}}>
        {isCharge
          ?<button className="quickBtn greenBtn" onClick={()=>onExecuteCharge(payment.id)} disabled={processing}>Cobrar con Stripe</button>
          :<button className="quickBtn" style={{background:"#1262ff"}} onClick={()=>onExecutePayout(payment.id)} disabled={processing}>{rep?.bankName?"Pagar vía banco":"Pagar con Stripe"}</button>
        }
        <button className="quickBtn" onClick={()=>onMarkManual(payment.id)}>Marcar manual</button>
        <button className="quickBtn redBtn" onClick={()=>onDelete(payment.id)}>Eliminar</button>
      </div>
    )}
    {payment.status==="paid"&&payment.paidAt&&<div className="repMeta" style={{marginTop:8}}>✓ Pagado el {payment.paidAt}</div>}
  </div></Card>);
}

function StatusBadge({status}){
  const map={paid:["Pagado","statusGreen"],pending:["Pendiente","statusWarn"],processing:["Procesando","statusBlue"],failed:["Fallido","statusRed"],Pagado:["Pagado","statusGreen"],Pendiente:["Pendiente","statusWarn"]};
  const [label,cls]=map[status]||[status,"statusWarn"];
  return <span className={cls}>{label}</span>;
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function Pipeline({opps,reps,clients,filters,setFilters,updateOpp,deleteOpp,generateContract,markPaid,waUrl,canManage,setShowOpp,expandedOppId,setExpandedOppId,noteInput,setNoteInput,addNote,session,onCreatePayment,onExport}){
  const totalValue=opps.reduce((s,o)=>s+product(o.productId).price,0);
  return(<section>
    <Top title={`${opps.length} oportunidades · ${money(totalValue)}`} eyebrow="Pipeline operativo">
      <div className="topBtns"><Btn small onClick={onExport}>CSV</Btn>{canManage&&<Btn variant="orange" onClick={()=>setShowOpp(true)}>+ Nueva</Btn>}</div>
    </Top>
    <div className="pipelineFiltersBar">
      <input className="pipelineSearch" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder="Buscar promotora o producto..."/>
      <select value={filters.stage} onChange={e=>setFilters({...filters,stage:e.target.value})}><option value="all">Todas las etapas</option>{STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select>
      <select value={filters.repId} onChange={e=>setFilters({...filters,repId:e.target.value})}><option value="all">Todos los comerciales</option>{reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
    </div>
    <div className="oppList">
      {opps.length===0&&<Card><div className="cardContent muted">Sin oportunidades.</div></Card>}
      {opps.map(opp=>{
        const p=product(opp.productId); const rep=reps.find(r=>r.id===opp.repId); const expanded=expandedOppId===opp.id;
        return(<Card key={opp.id}><div className="opp">
          <div className="oppHead" onClick={()=>setExpandedOppId(expanded?null:opp.id)} style={{cursor:"pointer"}}>
            <div>
              <div className="oppName">{opp.promoter}<span className="pill" style={{background:p.color+"22",color:p.color}}>{p.name}</span></div>
              <div className="oppMeta">{rep?.name||"Sin comercial"} · {opp.createdAt} · actualizado {opp.updatedAt}</div>
            </div>
            <div className="oppValue">{money(p.price)}<div className="prob">{opp.probability}%</div></div>
          </div>
          <div className="pipelineControls">
            <select value={opp.stage} onChange={e=>updateOpp(opp.id,{stage:e.target.value,probability:e.target.value==="Ganado"?100:opp.probability})}>{STAGES.map(s=><option key={s}>{s}</option>)}</select>
            <select value={opp.paymentStatus} onChange={e=>updateOpp(opp.id,{paymentStatus:e.target.value})}>{PAYMENT_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            <input type="number" min="0" max="100" value={opp.probability} onChange={e=>updateOpp(opp.id,{probability:Number(e.target.value)})}/>
          </div>
          <div className="bar"><div className="barFill" style={{width:`${opp.probability}%`,background:opp.stage==="Ganado"?"#18a058":opp.stage==="Perdido"?"#e03131":"#1262ff"}}/></div>
          <div className="quickActions">
            <a href={waUrl(opp)} target="_blank" rel="noreferrer" className="quickBtn whatsapp">WhatsApp</a>
            <button onClick={()=>generateContract(opp)} className="quickBtn">Contrato</button>
            <button onClick={()=>markPaid(opp)} className="quickBtn greenBtn">Marcar pagado</button>
            <button onClick={()=>onCreatePayment(opp,"client_charge")} className="quickBtn" style={{background:"#1262ff"}}>+ Cobro</button>
            <button onClick={()=>onCreatePayment(opp,"rep_payout")} className="quickBtn" style={{background:"#6c35e8"}}>+ Comisión</button>
            {canManage&&<button onClick={()=>deleteOpp(opp.id)} className="quickBtn redBtn">Eliminar</button>}
          </div>
          {expanded&&<div className="notesSection">
            <div className="eyebrow eyebrowBlue" style={{marginBottom:10}}>Actividad ({(opp.notes||[]).length})</div>
            {!(opp.notes||[]).length&&<div className="muted smallText">Sin notas.</div>}
            {(opp.notes||[]).map((n,i)=><div key={i} className="noteItem"><span className="noteAuthor">{n.author}</span><span className="noteTs">{n.ts}</span><div className="noteText">{n.text}</div></div>)}
            <div className="noteInputRow"><input value={noteInput} onChange={e=>setNoteInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote(opp.id)} placeholder="Añadir nota..." className="noteInput"/><button onClick={()=>addNote(opp.id)} className="quickBtn">Añadir</button></div>
          </div>}
        </div></Card>);
      })}
    </div>
  </section>);
}

// ─── FUNNEL ───────────────────────────────────────────────────────────────────
function Funnel({funnel,opps,reps}){
  const max=Math.max(...funnel.map(f=>f.count),1);
  const globalCR=pct(funnel.find(f=>f.stage==="Ganado")?.count||0,opps.length);
  return(<section>
    <Top title="Embudo de conversión." eyebrow="Funnel comercial"/>
    <div className="grid2" style={{marginTop:24}}>
      <Card><div className="cardContent">
        <div className="eyebrow eyebrowBlue" style={{marginBottom:20}}>Por etapa</div>
        {funnel.map((f,i)=>(
          <div key={f.stage} className="funnelRow">
            <div className="funnelLabel">{f.stage}</div>
            <div className="funnelBar"><div className="funnelFill" style={{width:`${pct(f.count,max)}%`,background:f.stage==="Ganado"?"#18a058":f.stage==="Perdido"?"#e03131":`hsl(${220-i*20},70%,50%)`}}/></div>
            <div className="funnelMeta"><b>{f.count}</b> · {money(f.value)}</div>
          </div>
        ))}
      </div></Card>
      <Card><div className="cardContent">
        <div className="eyebrow eyebrowBlue" style={{marginBottom:20}}>Por comercial</div>
        <div className="tableScroll"><table>
          <thead><tr><th>Comercial</th><th className="right">Total</th><th className="right">Ganados</th><th className="right">Perdidos</th><th className="right">CR%</th></tr></thead>
          <tbody>{reps.map(rep=>{
            const total=opps.filter(o=>o.repId===rep.id).length;
            const won=opps.filter(o=>o.repId===rep.id&&o.stage==="Ganado").length;
            const lost=opps.filter(o=>o.repId===rep.id&&o.stage==="Perdido").length;
            return(<tr key={rep.id}><td><div className="repName">{rep.name}</div></td><td className="right">{total}</td><td className="right moneyGreen">{won}</td><td className="right" style={{color:"#e03131"}}>{lost}</td><td className="right strong">{pct(won,total)}%</td></tr>);
          })}</tbody>
        </table></div>
        <div className="funnelKpis"><div className="financeCard"><div className="financeLabel">Conversión global</div><div className="financeValue">{globalCR}%</div></div><div className="financeCard"><div className="financeLabel">Total oportunidades</div><div className="financeValue">{opps.length}</div></div></div>
      </div></Card>
    </div>
  </section>);
}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────
function Contracts({opps,reps,updateOpp,generateContract,contractText,contractFilter,setContractFilter,downloadContract,onExport}){
  const filtered=contractFilter==="all"?opps:opps.filter(o=>o.contractStatus===contractFilter);
  return(<section>
    <Top title="Contratos." eyebrow="Sistema de contratos"><div className="topBtns"><Btn small onClick={onExport}>CSV</Btn></div></Top>
    <div className="grid2">
      <Card><div className="cardContent">
        <div className="topLine" style={{marginBottom:14}}>
          <div className="eyebrow eyebrowBlue">Oportunidades</div>
          <select value={contractFilter} onChange={e=>setContractFilter(e.target.value)} className="filterSelect"><option value="all">Todos</option>{CONTRACT_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
        </div>
        <div className="tableScroll"><table>
          <thead><tr><th>Cliente</th><th>Producto</th><th>Pago</th><th>Contrato</th><th></th></tr></thead>
          <tbody>{filtered.map(opp=>(
            <tr key={opp.id}><td>{opp.promoter}</td><td>{product(opp.productId).name}</td>
              <td><span className={opp.paymentStatus==="Pagado"?"statusGreen":"statusWarn"}>{opp.paymentStatus}</span></td>
              <td><select value={opp.contractStatus} onChange={e=>updateOpp(opp.id,{contractStatus:e.target.value})}>{CONTRACT_STATUSES.map(s=><option key={s}>{s}</option>)}</select></td>
              <td><button className="miniBtn" onClick={()=>generateContract(opp)}>Generar</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div></Card>
      <Card><div className="cardContent">
        <div className="topLine" style={{marginBottom:14}}>
          <div className="eyebrow eyebrowBlue">Vista previa</div>
          {contractText&&<button className="miniBtn" onClick={downloadContract}>Descargar .txt</button>}
        </div>
        <pre className="contractBox">{contractText||"Selecciona una oportunidad y pulsa Generar."}</pre>
      </div></Card>
    </div>
  </section>);
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────
function Finance({finance,reps,onExport}){
  const rows=[["MRR total",finance.mrr],["Inicial cobrado",finance.initialPaid],["Pendiente cobro",finance.pendingCollection],["Cobro mensual",finance.monthlyDue],["Bonus desbloqueados",finance.bonus],["Margen neto",finance.margin]];
  return(<section>
    <Top title="Cobros y comisiones." eyebrow="Cobros"><Btn small onClick={onExport}>CSV</Btn></Top>
    <div className="financeGrid">{rows.map(([l,v])=><div className="financeCard" key={l}><div className="financeLabel">{l}</div><div className="financeValue">{money(v)}</div></div>)}</div>
    <Card><div className="cardContent"><div className="tableScroll"><table>
      <thead><tr><th>Comercial</th><th>Ciudad</th><th>Rango</th><th className="right">Ini%</th><th className="right">Men%</th><th className="right">Pendiente</th><th className="right">Mensual</th><th className="right">Bonus</th></tr></thead>
      <tbody>{reps.map(rep=><tr key={rep.id}><td><div className="repName">{rep.name}</div></td><td>{rep.city}</td><td><RankBadge rank={rep.stats.rank}/></td><td className="right">{rep.initialCommissionPercent}%</td><td className="right">{rep.recurringCommissionPercent}%</td><td className="right pendingMoney">{money(rep.stats.pendingCollection)}</td><td className="right moneyGreen">{money(rep.stats.monthlyDue)}</td><td className="right strong">{money(rep.stats.rank.bonus)}</td></tr>)}</tbody>
    </table></div></div></Card>
  </section>);
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function CashCalendar({opps,reps,selectedMonth,setSelectedMonth}){
  const calendar=buildCashCalendar(opps,reps,12);
  const selected=calendar.find(c=>c.month===selectedMonth)||calendar[0];
  const maxExpected=Math.max(...calendar.map(c=>c.totalExpected),1);
  return(<section>
    <Top title="Flujo de caja a 12 meses." eyebrow="Calendario financiero"/>
    <div className="calendarGrid">{calendar.map(c=>(
      <button key={c.month} className={`monthCard ${selectedMonth===c.month?"monthActive":""}`} onClick={()=>setSelectedMonth(c.month)}>
        <div className="monthBarOuter"><div className="monthBarInner" style={{width:`${pct(c.totalExpected,maxExpected)}%`}}/></div>
        <div className="monthName">{prettyMonth(c.month)}</div>
        <div className="monthMoney">{money(c.totalExpected)}</div>
        <div className="monthMeta">Cobrado: {money(c.collected)}</div>
        <div className="monthMeta">Previsto: {money(c.forecast)}</div>
      </button>
    ))}</div>
    <div className="grid2 calendarDetail">
      <Card><div className="cardContent">
        <div className="eyebrow eyebrowBlue">Resumen — {prettyMonth(selected.month)}</div>
        <div className="financeGrid miniFinance" style={{marginTop:16}}>
          {[["Cobrado",selected.collected],["Previsto",selected.forecast],["Recurrente",selected.recurring],["Pendiente",selected.pending]].map(([l,v])=><div className="financeCard" key={l}><div className="financeLabel">{l}</div><div className="financeValue">{money(v)}</div></div>)}
        </div>
      </div></Card>
      <Card><div className="cardContent">
        <div className="eyebrow eyebrowBlue">Leyenda</div>
        <p className="muted" style={{marginTop:12}}>Cobrado = clientes Ganado+Pagado activos. Previsto = probabilidad aplicada. Recurrente = proyección continua de clientes activos.</p>
      </div></Card>
    </div>
    <Card><div className="cardContent">
      <div className="eyebrow eyebrowBlue" style={{marginBottom:16}}>Desglose — {prettyMonth(selected.month)}</div>
      <div className="tableScroll"><table>
        <thead><tr><th>Tipo</th><th>Cliente</th><th>Producto</th><th>Comercial</th><th>Estado</th><th className="right">Cantidad</th></tr></thead>
        <tbody>{selected.rows.length?selected.rows.map((row,i)=><tr key={i}><td>{row.type}</td><td>{row.client}</td><td>{row.productName}</td><td>{row.repName}</td><td>{row.status}</td><td className="right strong">{money(row.amount)}</td></tr>):<tr><td colSpan="6" className="muted">Sin cobros este mes.</td></tr>}</tbody>
      </table></div>
    </div></Card>
  </section>);
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function Admin({canAdmin,reps,setReps,products,updateProduct,resetDemo}){
  if(!canAdmin) return <Card><div className="cardContent"><h1 className="title">Acceso bloqueado.</h1></div></Card>;
  function updateRep(id,field,value){ setReps(p=>p.map(r=>r.id===id?{...r,[field]:field.includes("Percent")||field.includes("Override")?(value===""?"":Number(value)):value}:r)); }
  return(<section>
    <Top title="Panel admin." eyebrow="Admin"><Btn variant="orange" onClick={resetDemo}>Reset demo</Btn></Top>
    <div className="eyebrow eyebrowBlue" style={{margin:"0 0 10px"}}>Catálogo de productos</div>
    <Card style={{marginBottom:28}}><div className="cardContent">
      <div className="adminProductsInfo">Cambios de precio se aplican en tiempo real a comisiones, cobros y calendario.</div>
      <div className="tableScroll"><table>
        <thead><tr><th>ID</th><th>Nombre</th><th>Precio/mes</th><th>Color</th><th className="right">Comisión inicial (50%)</th><th className="right">Comisión mensual (20%)</th></tr></thead>
        <tbody>{products.map(p=>(
          <tr key={p.id}>
            <td><code className="idPill">{p.id}</code></td>
            <td><input className="tableInput" value={p.name} onChange={e=>updateProduct(p.id,"name",e.target.value)}/></td>
            <td><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:"#98a2b3",fontWeight:700}}>$</span><input className="tableInput small" type="number" min="0" value={p.price} onChange={e=>updateProduct(p.id,"price",e.target.value)}/></div></td>
            <td><div style={{display:"flex",alignItems:"center",gap:8}}><input type="color" value={p.color} onChange={e=>updateProduct(p.id,"color",e.target.value)} style={{width:34,height:34,border:"none",borderRadius:8,cursor:"pointer",padding:2}}/><input className="tableInput small" value={p.color} onChange={e=>updateProduct(p.id,"color",e.target.value)} style={{width:90,fontFamily:"monospace",fontSize:12}}/></div></td>
            <td className="right moneyGreen">{money(p.price*0.5)}</td>
            <td className="right" style={{color:"#1262ff",fontWeight:800}}>{money(p.price*0.2)}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div></Card>
    <div className="eyebrow eyebrowBlue" style={{margin:"0 0 10px"}}>Comerciales</div>
    <Card><div className="cardContent"><div className="tableScroll"><table>
      <thead><tr><th>Nombre</th><th>Email</th><th>Ciudad</th><th>Rol</th><th>Estado</th><th>Ini%</th><th>Men%</th><th>Pend.manual</th><th>Men.manual</th></tr></thead>
      <tbody>{reps.map(rep=>(
        <tr key={rep.id}>
          <td><input className="tableInput" value={rep.name} onChange={e=>updateRep(rep.id,"name",e.target.value)}/></td>
          <td><input className="tableInput" value={rep.email} onChange={e=>updateRep(rep.id,"email",e.target.value)}/></td>
          <td><input className="tableInput" value={rep.city} onChange={e=>updateRep(rep.id,"city",e.target.value)}/></td>
          <td><select value={rep.role} onChange={e=>updateRep(rep.id,"role",e.target.value)}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></td>
          <td><select value={rep.status} onChange={e=>updateRep(rep.id,"status",e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></td>
          <td><input className="tableInput small" type="number" value={rep.initialCommissionPercent??50} onChange={e=>updateRep(rep.id,"initialCommissionPercent",e.target.value)}/></td>
          <td><input className="tableInput small" type="number" value={rep.recurringCommissionPercent??20} onChange={e=>updateRep(rep.id,"recurringCommissionPercent",e.target.value)}/></td>
          <td><input className="tableInput small" type="number" placeholder="Auto" value={rep.pendingCollectionOverride??""} onChange={e=>updateRep(rep.id,"pendingCollectionOverride",e.target.value)}/></td>
          <td><input className="tableInput small" type="number" placeholder="Auto" value={rep.monthlyDueOverride??""} onChange={e=>updateRep(rep.id,"monthlyDueOverride",e.target.value)}/></td>
        </tr>
      ))}</tbody>
    </table></div></div></Card>
  </section>);
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function RepModal({rep,setRep,onCancel,onSave,canAdmin,title}){
  const [activeSection,setActiveSection]=useState("basic");
  const sections=[["basic","Datos básicos"],["bank","Datos bancarios"],["fiscal","Datos fiscales"],["extra","Contacto y notas"]];
  const f=(label,field,type="text",opts=null)=>(
    <Field label={label}>
      {opts?<select value={rep[field]||""} onChange={e=>setRep({...rep,[field]:e.target.value})}>{opts.map(o=><option key={o}>{o}</option>)}</select>
           :<input type={type} value={rep[field]||""} onChange={e=>setRep({...rep,[field]:e.target.value})}/>}
    </Field>
  );
  return(<div className="modalOverlay"><div className="modal modalLarge">
    <h3>{title}</h3>
    <div className="modalTabs">{sections.map(([id,label])=><button key={id} className={`modalTabBtn ${activeSection===id?"modalTabActive":""}`} onClick={()=>setActiveSection(id)}>{label}</button>)}</div>
    {activeSection==="basic"&&<div className="modalGrid">
      {f("Nombre","name")}{f("Apellido","lastName")}{f("Teléfono","phone","tel")}{f("Email","email","email")}
      {f("Ciudad","city")}{f("Dirección","address")}{f("Fecha nacimiento","birthdate","date")}{f("DNI / Cédula","dni")}
      {canAdmin&&<>{f("Rol","role","text",ROLES)}{f("Estado","status","text",STATUSES)}{f("Cargo","cargo")}{f("Departamento","department")}</>}
      {f("Fecha de ingreso","hireDate","date")}
    </div>}
    {activeSection==="bank"&&<div className="modalGrid">
      {f("Banco","bankName")}{f("Titular cuenta","bankHolder")}{f("Número de cuenta","bankAccount")}{f("IBAN","bankIban")}{f("SWIFT / BIC","bankSwift")}
      {canAdmin&&<>{f("Comisión inicial %","initialCommissionPercent","number")}{f("Comisión mensual %","recurringCommissionPercent","number")}{f("Pendiente manual (vacío=auto)","pendingCollectionOverride","number")}{f("Cobro mensual manual (vacío=auto)","monthlyDueOverride","number")}</>}
    </div>}
    {activeSection==="fiscal"&&<div className="modalGrid">
      {f("RUC","ruc")}{f("Razón social fiscal","fiscalName")}{f("Dirección fiscal","fiscalAddress")}
    </div>}
    {activeSection==="extra"&&<div className="modalGrid">
      {f("LinkedIn","linkedin")}{f("Instagram","instagram")}{f("Contacto emergencia","emergencyContact")}{f("Teléfono emergencia","emergencyPhone")}
      <Field label="Notas internas"><textarea value={rep.notes||""} onChange={e=>setRep({...rep,notes:e.target.value})} rows={4} style={{resize:"vertical",fontFamily:"inherit",fontSize:14,padding:"10px 12px",border:"1.5px solid #e4eaf6",borderRadius:12,outline:"none",width:"100%"}}/></Field>
    </div>}
    <div className="modalActions"><button onClick={onCancel}>Cancelar</button><button onClick={onSave}>Guardar</button></div>
  </div></div>);
}

function ClientModal({client,setClient,onCancel,onSave,title}){
  const [activeSection,setActiveSection]=useState("basic");
  const sections=[["basic","Datos básicos"],["bank","Facturación"],["extra","Contacto digital"]];
  const f=(label,field,type="text")=>(
    <Field label={label}><input type={type} value={client[field]||""} onChange={e=>setClient({...client,[field]:e.target.value})}/></Field>
  );
  return(<div className="modalOverlay"><div className="modal modalLarge">
    <h3>{title}</h3>
    <div className="modalTabs">{sections.map(([id,label])=><button key={id} className={`modalTabBtn ${activeSection===id?"modalTabActive":""}`} onClick={()=>setActiveSection(id)}>{label}</button>)}</div>
    {activeSection==="basic"&&<div className="modalGrid">
      {f("Empresa / Razón social","company")}{f("Nombre contacto","contactName")}{f("Cargo contacto","contactRole")}{f("Teléfono","phone","tel")}{f("Email","email","email")}{f("Dirección","address")}{f("Ciudad","city")}
    </div>}
    {activeSection==="bank"&&<div className="modalGrid">
      {f("RUC","ruc")}{f("Razón social fiscal","fiscalName")}{f("Dirección fiscal","fiscalAddress")}{f("Banco","bankName")}{f("Número de cuenta","bankAccount")}{f("Titular","bankHolder")}{f("Stripe Customer ID","stripeCustomerId")}
      <Field label="Notas internas"><textarea value={client.notes||""} onChange={e=>setClient({...client,notes:e.target.value})} rows={3} style={{resize:"vertical",fontFamily:"inherit",fontSize:14,padding:"10px 12px",border:"1.5px solid #e4eaf6",borderRadius:12,outline:"none",width:"100%"}}/></Field>
    </div>}
    {activeSection==="extra"&&<div className="modalGrid">
      {f("Website","website")}{f("LinkedIn","linkedin")}{f("Instagram","instagram")}
    </div>}
    <div className="modalActions"><button onClick={onCancel}>Cancelar</button><button onClick={onSave}>Guardar</button></div>
  </div></div>);
}

function OppModal({reps,clients,newOpp,setNewOpp,onCancel,onSave}){
  return(<div className="modalOverlay"><div className="modal">
    <h3>Nueva oportunidad</h3>
    <Field label="Promotora / Cliente"><input value={newOpp.promoter} onChange={e=>setNewOpp({...newOpp,promoter:e.target.value})} onKeyDown={e=>e.key==="Enter"&&onSave()}/></Field>
    <Field label="Empresa cliente"><select value={newOpp.clientId||""} onChange={e=>setNewOpp({...newOpp,clientId:Number(e.target.value)})}><option value="">Sin vincular</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company}</option>)}</select></Field>
    <Field label="Producto"><select value={newOpp.productId} onChange={e=>setNewOpp({...newOpp,productId:e.target.value})}>{_products.map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}</select></Field>
    <Field label="Comercial"><select value={newOpp.repId} onChange={e=>setNewOpp({...newOpp,repId:Number(e.target.value)})}>{reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
    <Field label="Etapa"><select value={newOpp.stage} onChange={e=>setNewOpp({...newOpp,stage:e.target.value})}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></Field>
    <Field label="Probabilidad %"><input type="number" min="0" max="100" value={newOpp.probability} onChange={e=>setNewOpp({...newOpp,probability:Number(e.target.value)})}/></Field>
    <div className="modalActions"><button onClick={onCancel}>Cancelar</button><button onClick={onSave}>Guardar</button></div>
  </div></div>);
}

function ConfirmDialog({message,onOk,onCancel}){
  return(<div className="modalOverlay"><div className="modal confirmModal">
    <div className="confirmIcon">⚠</div><p className="confirmMsg">{message}</p>
    <div className="modalActions"><button onClick={onCancel}>Cancelar</button><button className="btnDanger" onClick={onOk}>Confirmar</button></div>
  </div></div>);
}

function Login({loginForm,setLoginForm,loginError,login}){
  return(<div className="app loginApp"><Styles/><div className="loginCard">
    <div className="brand"><div className="brandMark">IP</div><div><div className="brandTitle">INMOPROYECTOS CRM</div><div className="brandSub">Acceso comercial seguro</div></div></div>
    <h1>Login operativo</h1>
    <p>Demo local con roles. Producción: Supabase/Firebase.</p>
    <Field label="Email"><input value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} onKeyDown={e=>e.key==="Enter"&&login()}/></Field>
    <Field label="Contraseña"><input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&login()}/></Field>
    {loginError&&<div className="errorBox">{loginError}</div>}
    <Btn variant="orange" onClick={login}>Entrar</Btn>
    <div className="demoAccess">admin / admin123 · manager / manager123 · comercial / comercial123</div>
  </div></div>);
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Btn({children,variant="dark",onClick,small,danger}){ return <button type="button" onClick={onClick} className={`btn ${variant==="orange"?"btnOrange":variant==="ghost"?"btnGhost":danger?"btnDanger":"btnDark"} ${small?"btnSmall":""}`}>{children}</button>; }
function Card({children,className="",style}){ return <div className={`card ${className}`} style={style}>{children}</div>; }
function Field({label,children}){ return <label className="field"><span>{label}</span>{children}</label>; }
function Top({title,eyebrow,children}){ return <div className="topActions"><div><div className="eyebrow eyebrowBlue">{eyebrow}</div><h1 className="title">{title}</h1></div>{children&&<div className="topBtns">{children}</div>}</div>; }
function Kpi({label,value,sub,icon,warn,green}){ return <Card><div className="cardContent kpi"><div><div className="kpiLabel">{label}</div><div className={`kpiValue ${warn?"kpiWarn":green?"kpiGreen":""}`}>{value}</div><div className="kpiSub">{sub}</div></div><div className="iconBox">{icon}</div></div></Card>; }
function Dark({label,value,green,warn}){ return <div className="darkStat"><div className="darkStatLabel">{label}</div><div className={`darkStatValue ${green?"green":""} ${warn?"warn":""}`}>{value}</div></div>; }
function RankBadge({rank}){ const cls={BRONZE:"bronze",SILVER:"silver",GOLD:"gold",PLATINUM:"platinum","BLACK DIAMOND":"black"}[rank.name]||"bronze"; return <span className={`rank ${cls}`}>{rank.name}</span>; }
function Catalog({products}){ return <section className="catalog"><Card><div className="cardContent"><Top title="Catálogo y comisiones." eyebrow="Productos vendibles"/><div className="productGrid">{products.map(p=><div className="product" key={p.id}><div className="productStripe" style={{background:p.color}}/><div className="productBody"><div className="productName">{p.name}</div><div className="productPrice">{money(p.price)}</div><div className="commissionBox"><div className="row"><span>Inicial 50%</span><b>{money(p.price*0.5)}</b></div><div className="row"><span>Mensual 20%</span><b className="greenText">{money(p.price*0.2)}</b></div></div></div></div>)}</div></div></Card></section>; }

// ─── STYLES ───────────────────────────────────────────────────────────────────
function Styles(){
  return(<style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,800;0,9..40,900;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif}
.app{min-height:100vh;background:#f0f2f7;color:#07182d}
.wrap{width:min(1360px,96vw);margin:0 auto}
.header{position:sticky;top:0;z-index:40;background:#fff;border-bottom:2px solid #e8edf6;box-shadow:0 2px 16px rgba(7,24,45,.06)}
.headerInner{min-height:68px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.brand{display:flex;gap:12px;align-items:center}
.brandMark{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#1262ff,#35a1ff);display:grid;place-items:center;color:#fff;font-weight:900;font-size:14px}
.brandTitle{font-size:17px;font-weight:900;letter-spacing:-.06em}
.brandSub{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#98a2b3}
.tabs{display:flex;gap:1px;flex-wrap:wrap}
.tabs button{border:none;background:transparent;border-radius:8px;padding:7px 11px;font-weight:700;font-size:12px;color:#667085;cursor:pointer;position:relative;transition:all .15s;font-family:inherit}
.tabs button:hover{background:#f0f2f7;color:#07182d}
.tabs .active{background:#07182d;color:#fff}
.badge{position:absolute;top:1px;right:1px;background:#e03131;color:#fff;border-radius:999px;font-size:8px;font-weight:900;padding:2px 4px;min-width:14px;text-align:center}
.sessionBox{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700}
.sessionBox b{background:#edf4ff;color:#124cb0;border-radius:999px;padding:4px 8px;font-size:10px}
.sessionBox button{border:1px solid #dfe6ef;background:#fff;border-radius:999px;padding:6px 12px;font-weight:800;cursor:pointer;font-family:inherit}
.main{padding:24px 0 60px}
/* Toast */
.toast{position:fixed;bottom:24px;right:24px;z-index:999;padding:13px 20px;border-radius:14px;font-weight:800;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,.18);animation:slideIn .25s ease;font-family:inherit}
.toast-ok{background:#07182d;color:#fff}.toast-warn{background:#ff8a1f;color:#fff}.toast-error{background:#e03131;color:#fff}
@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
/* Processing overlay */
.processingOverlay{position:fixed;inset:0;background:rgba(7,24,45,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:500;gap:16px}
.processingSpinner{width:48px;height:48px;border:4px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite}
.processingText{color:#fff;font-weight:800;font-size:16px}
@keyframes spin{to{transform:rotate(360deg)}}
/* Notifications */
.notifBar{display:flex;flex-direction:column;gap:6px;margin-bottom:18px}
.notif{padding:10px 16px;border-radius:10px;font-size:12px;font-weight:700}
.notif-warn{background:#fff4e0;border:1px solid #ffd28a;color:#7c4700}
.notif-alert{background:#fff1f1;border:1px solid #ffc9c9;color:#7c1a1a}
.notif-info{background:#e8f4ff;border:1px solid #b0d4ff;color:#0a3a7a}
/* Layout */
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.grid2{display:grid;grid-template-columns:1.1fr .9fr;gap:20px;margin-top:20px}
/* Cards */
.card{background:#fff;border:1px solid #e4eaf6;border-radius:18px;box-shadow:0 3px 16px rgba(7,24,45,.05);overflow:hidden}
.cardDark{background:linear-gradient(155deg,#07182d 0%,#0d2a52 100%);color:#fff;border:none}
.cardContent{padding:22px}
/* KPI */
.kpi{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
.kpiLabel,.eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#98a2b3}
.eyebrowBlue{color:#1262ff}.eyebrowOrange{color:#ffb940}
.kpiValue{font-size:30px;font-weight:900;letter-spacing:-.07em;margin-top:5px;color:#07182d}
.kpiWarn{color:#ff8a1f}.kpiGreen{color:#18a058}
.kpiSub{font-size:11px;font-weight:700;color:#667085;margin-top:3px}
.iconBox{width:40px;height:40px;border-radius:12px;background:#f0f5ff;display:grid;place-items:center;font-weight:900;font-size:16px;flex-shrink:0}
/* Top */
.title{font-size:36px;font-weight:900;letter-spacing:-.07em;line-height:.98;margin:5px 0 0}
.titleDark{color:#fff}
.topLine,.topActions{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}
.topActions{margin-bottom:20px}
.topBtns{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
/* Tables */
.tableScroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;margin-top:16px;min-width:560px}
thead{background:#f7f9fc;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#98a2b3}
th,td{padding:11px 13px;border-top:1px solid #edf2f7;text-align:left;font-size:13px;font-weight:500}
th{font-weight:800;border-top:none;padding-top:9px;padding-bottom:9px}
tbody tr{cursor:pointer;background:#fff;transition:background .1s}
tbody tr:hover,.selectedRow{background:#f4f7ff!important}
.repName{font-weight:800;font-size:13px}
.repMeta{font-size:11px;font-weight:600;color:#667085;margin-top:1px}
/* Ranks */
.rank{display:inline-flex;border:1.5px solid;border-radius:999px;padding:4px 9px;font-size:9px;font-weight:800;letter-spacing:.08em}
.bronze{background:#fff3e6;color:#9a4b00;border-color:#ffc078}
.silver{background:#f1f5f9;color:#475569;border-color:#cbd5e1}
.gold{background:#fff8db;color:#8a5b00;border-color:#e8c76d}
.platinum{background:#ecfeff;color:#0e7490;border-color:#67e8f9}
.black{background:#020617;color:#fff;border-color:#020617}
/* Colors */
.moneyGreen{font-weight:800;color:#18a058}
.pendingMoney{font-weight:800;color:#ff8a1f}
.right{text-align:right}.strong{font-weight:800}.muted{font-weight:600;color:#667085;line-height:1.6}
.rowActions{display:flex;gap:5px}
.sectionLabel{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#1262ff;margin-bottom:10px}
/* Buttons */
.btn{border:none;border-radius:999px;padding:10px 16px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-family:inherit;transition:opacity .15s}
.btn:hover{opacity:.85}
.btnDark{background:#07182d;color:#fff}.btnOrange{background:#ff8a1f;color:#fff}.btnDanger{background:#e03131;color:#fff}.btnGhost{background:#f0f2f7;color:#07182d;border:1px solid #e4eaf6}
.btnSmall{padding:7px 13px;font-size:11px}
.miniBtn{border:1px solid #dfe6ef;background:#f7f9fc;color:#07182d;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit}
.miniBtn:hover{background:#e8edf6}
.miniBtnDanger{border-color:#ffcdca;background:#fff5f5;color:#e03131}
.editLight{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;border-radius:999px;padding:7px 13px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit}
/* Search */
.search{border:1.5px solid #dfe6ef;background:#fff;border-radius:999px;padding:8px 15px}
.search input{border:none;outline:none;font-weight:700;font-size:12px;width:170px;font-family:inherit}
/* Rep detail */
.contact{margin-top:8px;color:#94a3b8;font-size:11px;font-weight:700}
.statsGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
.darkStat{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);border-radius:14px;padding:14px}
.darkStatLabel{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8}
.darkStatValue{font-size:23px;font-weight:900;letter-spacing:-.06em;margin-top:5px}
.green{color:#86efac}.warn{color:#ffcb7a}
.bankChip{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);border-radius:10px;padding:8px 12px;margin-top:10px;font-size:11px;font-weight:700;color:#cbd5e1}
.clientNotes{background:rgba(255,255,255,.06);border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12px;color:#94a3b8;font-style:italic}
.unlock{margin-top:16px;border:1px solid rgba(255,138,31,.3);background:rgba(255,138,31,.08);border-radius:16px;padding:14px}
.progress{height:8px;background:rgba(255,255,255,.1);border-radius:999px;margin-top:10px;overflow:hidden}
.progressFill{height:100%;background:#ff8a1f;border-radius:999px;transition:width .5s ease}
.smallText{font-size:11px;font-weight:700;color:#cbd5e1;margin-top:7px}
/* Payments */
.periodBar{display:flex;gap:4px;margin-bottom:20px}
.periodBtn{border:1.5px solid #e4eaf6;background:#fff;border-radius:999px;padding:8px 16px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .15s}
.periodBtn:hover{border-color:#1262ff;color:#1262ff}
.periodActive{background:#07182d;color:#fff;border-color:#07182d}
.payRow{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #f0f2f7}
.payRow:last-child{border-bottom:none}
.payRowConcept{font-size:13px;font-weight:800;color:#07182d}
.payRowMeta{font-size:11px;font-weight:600;color:#667085;margin-top:2px}
.payRowRight{text-align:right;flex-shrink:0}
.payRowAmount{font-size:16px;font-weight:900;letter-spacing:-.04em}
/* Status badges */
.statusGreen{background:#e8f7ef;color:#18a058;border-radius:999px;padding:3px 9px;font-size:10px;font-weight:800}
.statusWarn{background:#fff4e0;color:#a05500;border-radius:999px;padding:3px 9px;font-size:10px;font-weight:800}
.statusBlue{background:#e8f0ff;color:#1262ff;border-radius:999px;padding:3px 9px;font-size:10px;font-weight:800}
.statusRed{background:#fff1f1;color:#e03131;border-radius:999px;padding:3px 9px;font-size:10px;font-weight:800}
/* Pipeline */
.pipelineFiltersBar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.pipelineSearch{border:1.5px solid #dfe6ef;background:#fff;border-radius:10px;padding:9px 14px;font-weight:700;font-size:12px;flex:1;min-width:180px;font-family:inherit;outline:none}
.pipelineFiltersBar select{border:1.5px solid #dfe6ef;background:#fff;border-radius:10px;padding:9px 12px;font-weight:700;font-size:12px;font-family:inherit;cursor:pointer}
.oppList{display:grid;gap:10px}
.opp{padding:18px}
.oppHead{display:flex;justify-content:space-between;gap:14px}
.oppName{font-size:16px;font-weight:800}
.pill{border-radius:999px;padding:4px 9px;font-size:10px;font-weight:800;margin-left:7px}
.oppMeta{font-size:11px;color:#667085;font-weight:600;margin-top:2px}
.oppValue{text-align:right;font-weight:900;font-size:18px;flex-shrink:0}
.prob{font-size:11px;color:#18a058;font-weight:700}
.bar{height:5px;background:#edf2f7;border-radius:999px;margin-top:10px;overflow:hidden}
.barFill{height:100%;border-radius:999px;transition:width .3s}
.pipelineControls{display:grid;grid-template-columns:1fr 1fr 80px;gap:8px;margin-top:12px}
.pipelineControls select,.pipelineControls input,td select,.tableInput,.filterSelect{border:1.5px solid #dfe6ef;border-radius:9px;padding:8px 11px;font-weight:700;font-size:12px;background:#fff;font-family:inherit;outline:none;width:100%}
.tableInput.small{max-width:80px}
.quickActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
.quickBtn{border:none;border-radius:999px;padding:7px 12px;background:#07182d;color:#fff;font-weight:800;text-decoration:none;cursor:pointer;font-size:11px;font-family:inherit}
.whatsapp{background:#25d366}.greenBtn{background:#18a058}.redBtn{background:#e03131}
/* Notes */
.notesSection{margin-top:16px;border-top:1px solid #edf2f7;padding-top:16px}
.noteItem{background:#f7f9fc;border-radius:10px;padding:10px;margin-bottom:7px}
.noteAuthor{font-weight:800;font-size:11px;color:#07182d}
.noteTs{font-size:10px;color:#98a2b3;margin-left:7px}
.noteText{font-size:12px;color:#374151;margin-top:3px;font-weight:500}
.noteInputRow{display:flex;gap:7px;margin-top:10px}
.noteInput{border:1.5px solid #dfe6ef;border-radius:9px;padding:9px 13px;font-size:12px;font-weight:600;flex:1;font-family:inherit;outline:none}
/* Funnel */
.funnelRow{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.funnelLabel{width:130px;font-size:11px;font-weight:700;color:#374151;flex-shrink:0}
.funnelBar{flex:1;height:22px;background:#f0f2f7;border-radius:5px;overflow:hidden}
.funnelFill{height:100%;border-radius:5px;transition:width .5s ease}
.funnelMeta{width:110px;text-align:right;font-size:11px;font-weight:700;color:#667085;flex-shrink:0}
.funnelKpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
/* Catalog */
.catalog{margin-top:20px}
.productGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:16px}
.product{border:1px solid #e4eaf6;border-radius:16px;background:#fff;overflow:hidden;transition:transform .15s,box-shadow .15s}
.product:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(7,24,45,.09)}
.productStripe{height:4px}
.productBody{padding:14px}
.productName{font-size:13px;font-weight:900;letter-spacing:-.03em}
.productPrice{font-size:20px;font-weight:900;letter-spacing:-.06em;margin-top:3px}
.commissionBox{background:#f7f9fc;border-radius:10px;padding:8px;margin-top:10px;font-size:10px;font-weight:700;color:#667085}
.row{display:flex;justify-content:space-between;align-items:center}.row+.row{margin-top:5px}.greenText{color:#18a058}
/* Finance */
.financeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}
.financeCard{background:linear-gradient(155deg,#07182d,#0d2a52);color:#fff;border-radius:16px;padding:16px}
.financeLabel{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8}
.financeValue{font-size:24px;font-weight:900;letter-spacing:-.06em;margin-top:5px}
/* Calendar */
.calendarGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.monthCard{border:1.5px solid #e4eaf6;background:#fff;border-radius:16px;padding:14px;text-align:left;cursor:pointer;transition:all .15s;width:100%;font-family:inherit}
.monthCard:hover{border-color:#1262ff;box-shadow:0 5px 18px rgba(18,98,255,.1)}
.monthActive{border-color:#ff8a1f!important;box-shadow:0 7px 24px rgba(255,138,31,.16)!important}
.monthBarOuter{height:4px;background:#edf2f7;border-radius:999px;margin-bottom:8px;overflow:hidden}
.monthBarInner{height:100%;background:#1262ff;border-radius:999px}
.monthActive .monthBarInner{background:#ff8a1f}
.monthName{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#667085}
.monthMoney{font-size:22px;font-weight:900;letter-spacing:-.06em;margin-top:5px;color:#07182d}
.monthMeta{font-size:10px;font-weight:700;color:#98a2b3;margin-top:3px}
.calendarDetail{margin-bottom:18px}
.miniFinance{grid-template-columns:repeat(2,1fr)}
/* Contracts */
.contractBox{white-space:pre-wrap;background:#07182d;color:#c8daf8;border-radius:14px;padding:16px;line-height:1.65;min-height:340px;font-family:'DM Mono',ui-monospace,monospace;font-size:11px}
/* Modals */
.modalOverlay{position:fixed;inset:0;background:rgba(7,24,45,.5);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(3px)}
.modal{background:#fff;padding:24px;border-radius:22px;width:min(520px,94vw);display:flex;flex-direction:column;gap:10px;max-height:90vh;overflow-y:auto}
.modalLarge{width:min(720px,96vw)}
.modalGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.modalTabs{display:flex;gap:4px;flex-wrap:wrap;border-bottom:2px solid #f0f2f7;padding-bottom:12px;margin-bottom:4px}
.modalTabBtn{border:none;background:transparent;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer;color:#667085;font-family:inherit;transition:all .15s}
.modalTabBtn:hover{background:#f0f2f7}
.modalTabActive{background:#07182d;color:#fff}
.modal h3{font-size:20px;font-weight:900;letter-spacing:-.05em}
.confirmModal{max-width:380px;text-align:center;gap:14px}
.confirmIcon{font-size:36px}
.confirmMsg{font-size:14px;font-weight:600;color:#374151;line-height:1.5}
.field{display:flex;flex-direction:column;gap:4px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#98a2b3}
.field input,.field select{border:1.5px solid #e4eaf6;border-radius:10px;padding:10px 11px;font-size:13px;font-weight:600;font-family:inherit;outline:none}
.field input:focus,.field select:focus{border-color:#1262ff}
.modalActions{display:flex;justify-content:flex-end;gap:8px;padding-top:6px}
.modalActions button{border:1px solid #dfe6ef;background:#f7f9fc;border-radius:999px;padding:10px 16px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit}
.modalActions button:last-child{background:#07182d;color:#fff;border-color:#07182d}
.modalActions .btnDanger{background:#e03131;color:#fff;border-color:#e03131}
/* Login */
.loginApp{min-height:100vh;display:grid;place-items:center;background:#f0f2f7;padding:20px}
.loginCard{background:#fff;border:1px solid #e4eaf6;border-radius:26px;box-shadow:0 20px 80px rgba(7,24,45,.12);width:min(440px,94vw);padding:28px;display:flex;flex-direction:column;gap:14px}
.loginCard h1{font-size:38px;font-weight:900;letter-spacing:-.08em;line-height:1;margin-top:10px}
.loginCard p{font-size:12px;font-weight:600;color:#667085;line-height:1.5}
.errorBox{background:#fff1f1;color:#b42318;border:1px solid #ffcdca;border-radius:10px;padding:10px;font-weight:800;font-size:12px}
.demoAccess{font-size:10px;font-weight:700;color:#98a2b3;background:#f7f9fc;border-radius:10px;padding:10px;line-height:1.7}
/* Admin */
.idPill{background:#f0f2f7;color:#475569;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;font-family:'DM Mono',monospace}
.adminProductsInfo{font-size:11px;font-weight:700;color:#667085;background:#f7f9fc;border-radius:9px;padding:9px 13px;margin-bottom:14px}
/* Responsive */
@media(max-width:1100px){.grid4,.productGrid,.financeGrid,.calendarGrid{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}.modalGrid{grid-template-columns:1fr}}
@media(max-width:680px){.grid4,.productGrid,.financeGrid,.calendarGrid,.statsGrid,.pipelineControls{grid-template-columns:1fr}.title{font-size:28px}.sessionBox span{display:none}.oppHead{flex-direction:column}.oppValue{text-align:left}.funnelLabel{width:80px}.periodBar{flex-wrap:wrap}}
  `}</style>);
}
