/* All invoice and recipient data stays in this browser. */
'use strict';
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'invoice-studio-v1';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const blankItem = () => ({id:uid(),description:'',dates:[today()],amount:''});
const blankInvoice = () => ({issueDate:today(),dueDate:'',recipientId:'',items:[blankItem()],notes:''});
let state = {business:{name:'',email:'',address:''},recipients:[],invoice:blankInvoice()};
let storageAvailable = true;
function notice(message) { $('notice').textContent=message; $('notice').hidden=!message; }
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if(saved) {
    if(!saved.business || !Array.isArray(saved.recipients) || !saved.invoice || !Array.isArray(saved.invoice.items)) throw new Error('Invalid saved data');
    const {taxRate, currency, number, ...savedInvoice}=saved.invoice;
    state={business:{...state.business,...saved.business},recipients:saved.recipients,invoice:{...state.invoice,...savedInvoice}};
    state.invoice.items=state.invoice.items.map(item=>{const {date,...rest}=item;return {...rest,dates:Array.isArray(item.dates)&&item.dates.length?item.dates:[date||'']};});
  }
} catch { storageAvailable=false; notice('Saved data could not be loaded. You can still create and download an invoice, but this session may not be saved.'); }
function save() {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); storageAvailable=true; $('save-state').textContent='Draft saved'; }
  catch { storageAvailable=false; $('save-state').textContent='Not saved'; notice('Browser storage is unavailable or full. Download your PDF before closing this page.'); }
}
const fields = {'business-name':['business','name'],'business-email':['business','email'],'business-address':['business','address'],'issue-date':['invoice','issueDate'],'due-date':['invoice','dueDate'],'notes':['invoice','notes']};
for(const [id,[group,key]] of Object.entries(fields)) {
  $(id).value=state[group][key];
  $(id).addEventListener('input',()=>{state[group][key]=$(id).value; changed();});
}
function money(cents) { return new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD'}).format(cents/100); }
function totals() {
  return {total:state.invoice.items.reduce((sum,item)=>sum+Math.round((Number(item.amount)||0)*100),0)};
}
function updateTotals() { $('grand-total').textContent=money(totals().total); }
let previewTimer, pdfUrl, currentPdf;
function changed() { save(); updateTotals(); clearTimeout(previewTimer); previewTimer=setTimeout(renderPdf,250); }
function renderRecipients() {
  const list=$('recipient-list'); list.replaceChildren(); $('recipient-count').textContent=state.recipients.length;
  const query=$('recipient-search').value.toLowerCase();
  const recipients=state.recipients.filter(r=>`${r.name} ${r.email}`.toLowerCase().includes(query));
  for(const recipient of recipients) {
    const row=document.createElement('div'); row.className='recipient-row'+(state.invoice.recipientId===recipient.id?' active':'');
    const button=document.createElement('button'); button.className='recipient-select'; button.type='button'; button.setAttribute('aria-pressed',String(state.invoice.recipientId===recipient.id));
    const avatar=document.createElement('span'); avatar.className='avatar'; avatar.textContent=recipient.name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
    const copy=document.createElement('span'); copy.className='recipient-copy'; const name=document.createElement('strong'); name.textContent=recipient.name; const email=document.createElement('small'); email.textContent=recipient.email||'No email added'; copy.append(name,email); button.append(avatar,copy);
    button.onclick=()=>{state.invoice.recipientId=recipient.id;renderRecipients();changed();};
    const edit=document.createElement('button');edit.className='icon-button edit-recipient';edit.textContent='✎';edit.setAttribute('aria-label',`Edit ${recipient.name}`);edit.onclick=()=>openRecipient(recipient);
    row.append(button,edit);list.append(row);
  }
  if(!recipients.length) {const p=document.createElement('p');p.className='empty';p.textContent=query?'No matching recipients.':'Your client list starts here. Add your first recipient below.';list.append(p);}
  const selected=state.recipients.find(r=>r.id===state.invoice.recipientId);$('bill-to').replaceChildren();
  if(selected) { const name=document.createElement('strong');name.textContent=selected.name;$('bill-to').append('BILL TO · ',name); if(selected.email) $('bill-to').append(document.createElement('br'),selected.email); }
  else $('bill-to').textContent='Select or add a recipient to get started.';
}
function renderItems() {
  $('items').replaceChildren();
  state.invoice.items.forEach((item,index)=>{
    const row=document.createElement('div');row.className='item-row';
    for(const [key,title,type] of [['description','Description','text'],['amount','Final amount','number']]) {
      const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type=type;input.value=item[key];input.setAttribute('aria-label',`${title}, item ${index+1}`);
      if(key==='amount'){input.step='0.01';input.min='0';input.max='999999999';input.placeholder='0.00';}
      if(key==='description'){input.placeholder='e.g. Design services';input.maxLength=4000;}
      input.oninput=()=>{item[key]=input.value;changed();};label.append(input);row.append(label);
    }
    const dates=document.createElement('div');dates.className='item-dates';
    const heading=document.createElement('span');heading.className='date-heading';heading.textContent='Dates';dates.append(heading);
    item.dates.forEach((value,dateIndex)=>{
      const dateRow=document.createElement('div');dateRow.className='date-row';
      const input=document.createElement('input');input.type='date';input.value=value;input.setAttribute('aria-label',`Date ${dateIndex+1}, item ${index+1}`);
      input.oninput=()=>{item.dates[dateIndex]=input.value;changed();};dateRow.append(input);
      if(item.dates.length>1){const removeDate=document.createElement('button');removeDate.type='button';removeDate.className='icon-button';removeDate.textContent='×';removeDate.setAttribute('aria-label',`Remove date ${dateIndex+1}, item ${index+1}`);removeDate.onclick=()=>{item.dates.splice(dateIndex,1);renderItems();changed();};dateRow.append(removeDate);}
      dates.append(dateRow);
    });
    const addDate=document.createElement('button');addDate.type='button';addDate.className='text-button add-date';addDate.textContent='＋ Add date';addDate.onclick=()=>{item.dates.push('');renderItems();changed();row.querySelectorAll('.date-row input')[item.dates.length-1].focus();};dates.append(addDate);row.append(dates);
    const remove=document.createElement('button');remove.className='icon-button';remove.textContent='×';remove.setAttribute('aria-label',`Remove item ${index+1}`);remove.onclick=()=>{state.invoice.items=state.invoice.items.filter(i=>i.id!==item.id);renderItems();changed();};row.append(remove);$('items').append(row);
  });
}
function openRecipient(recipient) {
  $('recipient-form').reset();$('recipient-id').value=recipient?.id||'';$('recipient-name').value=recipient?.name||'';$('recipient-email').value=recipient?.email||'';$('recipient-address').value=recipient?.address||'';$('dialog-title').textContent=recipient?'Edit recipient':'Add recipient';$('delete-recipient').hidden=!recipient;$('recipient-dialog').showModal();$('recipient-name').focus();
}
$('add-recipient').onclick=()=>openRecipient();$('close-dialog').onclick=()=>$('recipient-dialog').close();$('recipient-search').oninput=renderRecipients;
$('recipient-form').onsubmit=event=>{
  event.preventDefault();const name=$('recipient-name').value.trim();if(!name){$('recipient-name').setCustomValidity('Enter a recipient name.');$('recipient-name').reportValidity();return;}
  const recipient={id:$('recipient-id').value||uid(),name,email:$('recipient-email').value.trim(),address:$('recipient-address').value.trim()};const index=state.recipients.findIndex(r=>r.id===recipient.id);if(index>=0)state.recipients[index]=recipient;else state.recipients.push(recipient);state.invoice.recipientId=recipient.id;$('recipient-dialog').close();renderRecipients();changed();
};
$('recipient-name').oninput=()=>$('recipient-name').setCustomValidity('');
$('delete-recipient').onclick=()=>{if(!confirm('Delete this recipient from this browser?'))return;const id=$('recipient-id').value;state.recipients=state.recipients.filter(r=>r.id!==id);if(state.invoice.recipientId===id)state.invoice.recipientId='';$('recipient-dialog').close();renderRecipients();changed();};
$('add-item').onclick=()=>{state.invoice.items.push(blankItem());renderItems();changed();$('items').lastElementChild.querySelector('input').focus();};
$('new-invoice').onclick=()=>{
  if(!confirm('Start a new invoice? This replaces the current draft. Download it first if you want to keep it.'))return;
  const old=state.invoice;state.invoice=blankInvoice();state.invoice.notes=old.notes;state.invoice.recipientId=old.recipientId;
  for(const [id,[group,key]]of Object.entries(fields))$(id).value=state[group][key];renderItems();renderRecipients();changed();
};
function dateLabel(value) {if(!value)return '—';const [y,m,d]=value.split('-');return `${d}/${m}/${y}`;}
function pdfFileName() {
  const clean = value => String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'');
  return `Invoice ${clean(state.invoice.issueDate)} from ${clean(state.business.name)}.pdf`;
}
function buildPdf() {
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});const inv=state.invoice;const recipient=state.recipients.find(r=>r.id===inv.recipientId);const green=[23,78,70];const muted=[113,128,119];let y=22;
  doc.setProperties({title:`Invoice ${inv.issueDate}`,author:state.business.name,subject:'Invoice'});
  function text(value,x,at,size=10,color=[48,65,56],bold=false){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(String(value),x,at);}
  function room(height){if(y+height>275){doc.addPage();y=23;}}
  function lines(value,x,width,size=10,color=muted){doc.setFont('helvetica','normal');doc.setFontSize(size);for(const line of doc.splitTextToSize(String(value||''),width)){room(6);text(line,x,y,size,color);y+=5;} }
  text('INVOICE',20,y,28,green,true);y+=17;
  text('FROM',20,y,8,muted,true);y+=7;lines(state.business.name||'Your business name',20,170,13,green);lines(state.business.email,20,170,9);lines(state.business.address,20,170,9);y+=8;
  room(30);text('BILL TO',20,y,8,muted,true);text('ISSUED',126,y,8,muted,true);text('DUE',164,y,8,muted,true);text(dateLabel(inv.issueDate),126,y+7,9);text(dateLabel(inv.dueDate),164,y+7,9);y+=7;
  lines(recipient?.name||'Recipient name',20,95,12,green);lines(recipient?.email,20,95,9);lines(recipient?.address,20,95,9);y+=10;
  function tableHeader(){room(20);doc.setFillColor(...green);doc.rect(20,y,170,10,'F');text('DESCRIPTION',24,y+6.5,8,[255,255,255],true);text('DATES',132,y+6.5,8,[255,255,255],true);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(255,255,255);doc.text('AMOUNT',186,y+6.5,{align:'right'});y+=17;}
  tableHeader();
  for(const item of inv.items){doc.setFontSize(10);doc.setFont('helvetica','normal');const description=doc.splitTextToSize(item.description||'Item description',100);const dates=item.dates||[item.date||''];const rowLines=Math.max(description.length,dates.length);
    for(let lineIndex=0;lineIndex<rowLines;lineIndex++){if(y+8>272){doc.addPage();y=23;tableHeader();}if(description[lineIndex])text(description[lineIndex],24,y,10);if(dates[lineIndex])text(dateLabel(dates[lineIndex]),132,y,9,muted);if(lineIndex===0){doc.setFontSize(9);doc.setTextColor(...green);doc.text(money(Math.round((Number(item.amount)||0)*100)),186,y,{align:'right'});}y+=5;}
    y+=5;doc.setDrawColor(227,232,226);doc.line(20,y-3,190,y-3);y+=4;
  }
  room(20);y+=4;const t=totals();doc.setFillColor(238,245,239);doc.rect(112,y-6,78,12,'F');text('Total due',116,y,11,green,true);doc.setFontSize(12);doc.text(money(t.total),186,y,{align:'right'});y+=11;
  if(inv.notes.trim()){y+=10;room(16);text('NOTES & PAYMENT DETAILS',20,y,8,muted,true);y+=8;lines(inv.notes,20,165,10);}
  const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setDrawColor(227,232,226);doc.line(20,282,190,282);text('Thank you for your business.',20,289,8,muted);text(`${i} / ${pages}`,180,289,8,muted);}return doc;
}
function renderPdf(){
  try {currentPdf=buildPdf();const nextUrl=URL.createObjectURL(currentPdf.output('blob'));$('pdf-preview').src=nextUrl+'#toolbar=0&navpanes=0&view=FitH';const oldUrl=pdfUrl;pdfUrl=nextUrl;if(oldUrl)setTimeout(()=>URL.revokeObjectURL(oldUrl),1000);const pages=currentPdf.getNumberOfPages();$('page-count').textContent=`A4 · ${pages} ${pages===1?'PAGE':'PAGES'}`;}
  catch(error){notice('The PDF preview could not be generated. Check that the PDF library is available and reload the page.');console.error(error);}
}
$('download').onclick=()=>{
  if(!state.business.name.trim()){notice('Add your business name before downloading.');$('business-name').focus();return;}
  if(!state.recipients.some(r=>r.id===state.invoice.recipientId)){notice('Select or add a recipient before downloading.');$('add-recipient').focus();return;}
  if(!state.invoice.issueDate){notice('Enter an issue date before downloading.');$('issue-date').focus();return;}
  if(!state.invoice.items.length||state.invoice.items.some(i=>!i.description.trim()||!Array.isArray(i.dates)||!i.dates.length||i.dates.some(date=>!date)||i.amount===''||!Number.isFinite(Number(i.amount))||Number(i.amount)<0||Number(i.amount)>999999999)){notice('Each line item needs a description, one or more dates, and an amount between 0 and 999,999,999.');return;}
  if(state.invoice.dueDate&&state.invoice.dueDate<state.invoice.issueDate){notice('The due date must be on or after the issue date.');$('due-date').focus();return;}
  if(storageAvailable)notice('');try{const pdf=buildPdf();pdf.save(pdfFileName());}catch(error){notice('The PDF could not be downloaded. Please reload and try again.');console.error(error);}
};
renderRecipients();renderItems();updateTotals();renderPdf();
