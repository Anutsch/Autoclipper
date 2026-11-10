/* Keep the select as the settings model and render its controls in the app. */
(() => {
 let active;
 const valueProperty = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');

 function enhance(select) {
  const wrapper = document.createElement('span');
  wrapper.className = 'ac-select';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'ac-select-trigger';
  trigger.setAttribute('aria-haspopup','listbox');
  trigger.setAttribute('aria-expanded','false');
  const label = select.getAttribute('aria-label') || Array.from(select.closest('label')?.childNodes || [])
   .filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim();
  const value = document.createElement('span');
  trigger.append(value);
  const menu = document.createElement('div');
  menu.id = select.id+'-options';
  menu.className = 'ac-select-menu';
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label',label);
  menu.hidden = true;
  trigger.setAttribute('aria-controls',menu.id);
  const options = [...select.options].map(option=>{
   const button = document.createElement('button');
   button.type = 'button';
   button.className = 'ac-select-option';
   button.setAttribute('role','option');
   button.tabIndex = -1;
   button.textContent = option.textContent;
   button.disabled = option.disabled;
   button.onclick = event=>{
    event.preventDefault();
    if (select.value!==option.value) {
     select.value = option.value;
     select.dispatchEvent(new Event('input',{bubbles:true}));
     select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    close(true);
   };
   menu.append(button);
   return button;
  });

  function sync() {
   value.textContent = select.selectedOptions[0]?.textContent || '';
   trigger.setAttribute('aria-label',label+' · '+value.textContent);
   trigger.disabled = select.disabled;
   options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===select.selectedIndex)));
   if (trigger.disabled && !menu.hidden) close(false);
  }
  Object.defineProperty(select,'value',{
   configurable:true,
   get(){return valueProperty.get.call(select);},
   set(next){valueProperty.set.call(select,next);sync();}
  });
  select.addEventListener('change',sync);
  new MutationObserver(sync).observe(select,{attributes:true,attributeFilter:['disabled']});

  function close(focus) {
   menu.hidden = true;
   menu.remove();
   trigger.setAttribute('aria-expanded','false');
   if (active?.trigger===trigger) active = null;
   if (focus) trigger.focus();
  }
  function open() {
   active?.close(false);
   (trigger.closest('dialog[open]') || document.body).append(menu);
   menu.hidden = false;
   trigger.setAttribute('aria-expanded','true');
   active = {close,trigger,menu};
   const bounds = trigger.getBoundingClientRect();
   menu.style.left = '0px';
   menu.style.top = '0px';
   menu.style.width = 'max-content';
   menu.style.maxHeight = 'none';
   const width = Math.min(innerWidth-16,Math.max(bounds.width,menu.scrollWidth));
   menu.style.width = width+'px';
   menu.style.left = Math.max(8,Math.min(bounds.left,innerWidth-width-8))+'px';
   const below = innerHeight-bounds.bottom-12;
   const above = bounds.top-12;
   const openAbove = below < Math.min(menu.scrollHeight,180) && above > below;
   menu.style.maxHeight = Math.max(48,Math.min(260,openAbove?above:below))+'px';
   menu.style.top = (openAbove?bounds.top-menu.offsetHeight-4:bounds.bottom+4)+'px';
   (options[select.selectedIndex] || options[0])?.focus({preventScroll:true});
  }

  trigger.onclick = event=>{
   event.preventDefault();
   if (menu.hidden) open();
   else close(true);
  };
  trigger.addEventListener('keydown',event=>{
   if (event.key==='ArrowDown'||event.key==='ArrowUp') {event.preventDefault();open();}
  });
  menu.addEventListener('keydown',event=>{
   const available = options.filter(option=>!option.disabled);
   const index = available.indexOf(document.activeElement);
   if (event.key==='Escape') {
    event.preventDefault();event.stopPropagation();close(true);return;
   }
   if (event.key==='Tab') {close(true);return;}
   let next;
   if (event.key==='Home') next=0;
   else if (event.key==='End') next=available.length-1;
   else if (event.key==='ArrowDown') next=Math.min(available.length-1,index+1);
   else if (event.key==='ArrowUp') next=Math.max(0,index-1);
   else if (event.key.length===1 && event.key!==' ') {
    next=available.findIndex(option=>option.textContent.trim().toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
   }
   if (next>=0) {event.preventDefault();available[next]?.focus();}
  });
  select.before(wrapper);
  wrapper.append(select,trigger);
  select.hidden = true;
  sync();
 }
 document.addEventListener('pointerdown',event=>{
  if(active && !active.menu.contains(event.target) && !active.trigger.contains(event.target))active.close(false);
 });
 document.addEventListener('focusin',event=>{
  if(active && !active.menu.contains(event.target) && event.target!==active.trigger)active.close(false);
 });
 window.addEventListener('resize',()=>active?.close(false));
 document.addEventListener('scroll',event=>{
  if(active && event.target!==active.menu)active.close(false);
 },true);
 document.querySelectorAll('select').forEach(enhance);
})();
