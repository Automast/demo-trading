const SubscribePage = {
  plans: [],
  userCurrency: 'USD',
  fiatBalance: 0,
  currentPlan: null,
  init: async function() {
    await this.fetchData();
    this.renderPlans();
    this.setup();
  },
  fetchData: async function() {
    const res = await fetch(`/api/user/${window.currentUser.id}/subscription-overview`, { credentials: 'include' });
    if(res.ok){
      const data = await res.json();
      this.plans = data.plans || [];
      this.userCurrency = data.userCurrency;
      this.fiatBalance = data.fiatBalance || 0;
      this.userSubs = data.userSubscriptions || [];
    }
  },
  renderPlans: function() {
    const container = document.getElementById('subscriptionPlans');
    if(!container) return;
    const currency = this.userCurrency;
    container.innerHTML = this.plans.map(p=>{
      const sub = this.userSubs.find(s=>s.planName===p.name);
      const bal = sub ? parseFloat(sub.balance) : 0;
      return `
        <div class="stake-pool-card">
          <div class="pool-header"><h3>${p.name}</h3></div>
          <div class="pool-details">
            <div class="pool-detail"><span class="detail-label">Minimum</span><span class="detail-value">${p.minimum} ${currency}</span></div>
            <div class="pool-detail"><span class="detail-label">Maximum</span><span class="detail-value">${p.maximum} ${currency}</span></div>
            <div class="pool-detail"><span class="detail-label">Duration</span><span class="detail-value">${p.duration} days</span></div>
            <div class="pool-detail"><span class="detail-label">ROI</span><span class="roi-badge">${p.roi}%</span></div>
            <div class="pool-detail"><span class="detail-label">Current Balance</span><span class="detail-value">${bal} ${currency}</span></div>
          </div>
          <button class="stake-button" onclick="SubscribePage.open(${p.id})">Subscribe</button>
        </div>`;
    }).join('');
    document.getElementById('subscriptionBalance').textContent = `${currency}${this.fiatBalance.toFixed(2)}`;
  },
  setup: function(){
    const overlay=document.getElementById('subscribeModalOverlay');
    const closeBtn=document.getElementById('closeSubscribeModal');
    if(closeBtn) closeBtn.onclick=()=>{overlay.style.display='none';};
    overlay.addEventListener('click',(e)=>{if(e.target===overlay)overlay.style.display='none';});
    const form=document.getElementById('subscribeForm');
    form.addEventListener('submit', this.submit.bind(this));
  },
  open: function(planId){
    this.currentPlan = this.plans.find(p=>p.id===planId);
    if(!this.currentPlan) return;
    document.getElementById('subscribeModalTitle').textContent = `Subscribe ${this.currentPlan.name}`;
    document.getElementById('subscribeAmount').value = this.currentPlan.minimum;
    document.getElementById('subscribeModalOverlay').style.display='block';
  },
  submit: async function(e){
    e.preventDefault();
    if(!this.currentPlan) return;
    const amount=parseFloat(document.getElementById('subscribeAmount').value);
    const res = await fetch('/api/subscriptions',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:window.currentUser.id,planId:this.currentPlan.id,amount})});
    if(res.ok){
      alert('Subscription created');
      document.getElementById('subscribeModalOverlay').style.display='none';
      await this.fetchData();
      this.renderPlans();
    }else{
      const d=await res.json();
      alert(d.error||'Error');
    }
  }
};

window.initializeSubscribePage = function(){ SubscribePage.init(); };
