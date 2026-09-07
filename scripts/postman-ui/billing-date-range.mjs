export const billingDateRangeCopy = [
 ["onStart: e => this.updateBilling({ start: e.target.value, preset: 'custom' }), onEnd: e => this.updateBilling({ end: e.target.value, preset: 'custom' }),", "onStart: e => this.pmSetBillingDate('start',e.target.value), onEnd: e => this.pmSetBillingDate('end',e.target.value),"]
];
export function installBillingDateRange(t){
 for(const [a,b] of billingDateRangeCopy){if(!t.includes(a))throw Error('Billing dates anchor changed');t=t.replace(a,()=>b);}
 const form=`<div class="pm-billing-date-range" role="group" aria-label="用量时间范围">
    <label><span>时间范围</span><select aria-label="选择时间范围" value="{{ billing.preset }}" sc-camel-on-change="{{ billing.onPreset }}"><sc-for list="{{ billing.presets }}" as="preset"><option value="{{ preset.id }}" label="{{ preset.name }}">{{ preset.name }}</option></sc-for></select></label>
    <sc-if value="{{ billing.custom }}"><label><span>开始日期</span><input type="date" aria-label="开始日期" value="{{ billing.start }}" max="{{ billing.today }}" sc-camel-on-input="{{ billing.onStart }}" /></label><span class="pm-billing-date-separator" aria-hidden="true">至</span><label><span>结束日期</span><input type="date" aria-label="结束日期" value="{{ billing.end }}" max="{{ billing.today }}" sc-camel-on-input="{{ billing.onEnd }}" /></label></sc-if>
    <span class="pm-billing-date-note">北京时间 UTC+8 · 包含结束日期</span>
  </div>
  `;
 t=t.replace('<sc-if value="{{ billing.error }}">',form+'<sc-if value="{{ billing.error }}">');
 return t.replace('  billingMoney(micros) {',`  // pm-billing-date-range:start
  pmSetBillingDate(field,value) {
    if(!['start','end'].includes(field))return;
    const next={...this.billingPreset('yesterday'),...this.state.billing,[field]:value};
    const days=(this.billingStamp(next.end)-this.billingStamp(next.start))/86400000+1;
    const limits={hour:7,day:366,month:3653,year:18263};
    const grain=days>limits[next.grain]?Object.keys(limits).find(key=>days<=limits[key]) || 'year':next.grain;
    this.updateBilling({[field]:value,preset:'custom',timeMode:'custom',grain});
  }
  // pm-billing-date-range:end
  billingMoney(micros) {`);
}
