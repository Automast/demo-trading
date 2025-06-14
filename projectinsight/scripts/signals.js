const SignalsPage = {
  packages: [],
  userCurrency: 'USD',
  fiatBalance: 0,
  currentPkg: null,
  async init(){
    await this.fetchData();
    this.renderPackages();
    this.setup();
  },
  async fetchData(){
    const res = await fetch(`/api/user/${window.currentUser.id}/signal-overview`, {credentials:'include'});
    if(res.ok){
      const data = await res.json();
      this.packages = data.packages || [];
      this.userCurrency = data.userCurrency;
      this.fiatBalance = data.fiatBalance || 0;
      this.userSignals = data.userSignals || [];
    }
  },
  renderPackages(){
    const container=document.getElementById('signalPackages');
    if(!container) return;
    const currency=this.userCurrency;
    container.innerHTML=this.packages.map(p=>{
      const sig = this.userSignals.find(s=>s.signalName===p.name);
      const bal = sig ? parseFloat(sig.balance) : 0;
      return `<div class="stake-pool-card">
        <div class="pool-header"><h3>${p.name}</h3></div>
        <div class="pool-details">
          <div class="pool-detail"><span class="detail-label">Signal price</span><span class="detail-value">${p.price} ${currency}</span></div>
          <div class="pool-detail"><span class="detail-label">Signal strength</span><span class="roi-badge">${p.strength}%</span></div>
          <div class="pool-detail"><span class="detail-label">Current balance</span><span class="detail-value">${bal} ${currency}</span></div>
        </div>
        <button class="stake-button" onclick="SignalsPage.open(${p.id})">Buy</button>
      </div>`;
    }).join('');
    document.getElementById('signalBalance').textContent = `${currency}${this.fiatBalance.toFixed(2)}`;
  },
  setup(){
    const overlay=document.getElementById('signalModalOverlay');
    const closeBtn=document.getElementById('closeSignalModal');
    if(closeBtn) closeBtn.onclick=()=>{overlay.style.display='none';};
    overlay.addEventListener('click',(e)=>{if(e.target===overlay)overlay.style.display='none';});
    document.getElementById('confirmSignalBtn').onclick=this.purchase.bind(this);
  },
  open(id){
    this.currentPkg=this.packages.find(p=>p.id===id);
    if(!this.currentPkg) return;
    document.getElementById('signalModalTitle').textContent=`Buy ${this.currentPkg.name}`;
    document.getElementById('signalModalOverlay').style.display='block';
  },
  async purchase(){
    if(!this.currentPkg) return;
    const res = await fetch('/api/signals/purchase',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:window.currentUser.id,packageId:this.currentPkg.id})});
    if(res.ok){
      alert('Signal purchased');
      document.getElementById('signalModalOverlay').style.display='none';
      await this.fetchData();
      this.renderPackages();
    }else{
      const d=await res.json();
      alert(d.error||'Error');
    }
  }
};

window.initializeSignalsPage = function(){ SignalsPage.init(); };
