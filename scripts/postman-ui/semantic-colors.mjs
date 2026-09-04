// Presentation adapter for the prototype's legacy inline color bindings.
// Keep business status values, metrics and handlers unchanged. New components
// should use data-pm-tone directly instead of adding another literal palette.
const aliases = {
  success: ['#3f6b45','#4f7a52','#3e744a','#426c49','#456b48','#078334','#087b32','#18794e'],
  warning: ['#8a5a16','#885914','#875714','#94641b','#80551f','#915900','#b45309'],
  danger: ['#a5321f','#a33627','#a53c2b','#c52b2b','#a51d1d'],
};
const borders = {success:['#a7cfae','#93c5a2','#9ac9a7'],warning:['#e0c48c','#f0e0b9'],danger:['#eabaa8','#e2b3a6','#e5bcae']};
const marks = {success:['#5f9a63'],warning:['#c8912f'],danger:['#a5321f']};
const surfaces = ['#f4f1ec','#ece7df','#f2f7f2','#f5f7f4','#f0f1ed','#f6f6f3','#fafaf8','#eef0ea','#f1f1ef','#f8f8f7','#eeefeb','#f2f3ef','#edf7f0','#edf5ee','#fdf5f2','#fff8e8','#faf4e8','#fdf8ef','#fff1ea','#ffe6da','#fff1e9','#fbf2e5','#faeeeb','#faf6ed','#fffdf8','#f7fbf7'];
const neutralInk = ['#b3aca3','#666b61','#81877b','#646960','#777d72','#51564d','#62685c','#41463d','#6b7564','#53594e'];
const neutralEdges = ['#eae5dc','#e6e8e1','#d8ddd5','#c5cbc0','#c9ccc4','#d5dccd','#e3e5df','#d9d5d1','#e6e0d6','#e8d5cd'];
const statusBindings = {
  'd.badgeFg':'d.badge', 'd.stateFg':'d.state', 'r.fg':'r.state',
  'sheet.pick.fg':'sheet.pick.state', 'v.fg':'v.badge', 'q.fg':'q.badge',
  'round.fg':'round.label', 'life.fg':'life.state', 'n.badgeFg':'n.badge',
  'node.stateFg':'node.stateLabel', 'run.statusFg':'run.statusLabel', 'it.stateFg':'it.state',
};
export function semanticMarkup(markup) {
  return markup.replace(/<(div|span|button|input|select|textarea|strong|i|svg|a|label|section|article)\b[^>]*>/g, (tag,element,offset) => {
    const style=tag.match(/\sstyle="([^"]*)"/)?.[1] || '';
    const add=(name,value)=>{ if(!tag.includes(name+'='))tag=tag.replace(/^<(\w+)/,'<$1 '+name+'="'+value+'"'); };
    if(tag.includes('sc-camel-on-click="{{ openImport }}"')){
      tag=tag.replace(/ data-pm-secondary="true"/,'');add('data-pm-primary','true');
    }
    for(const [property,hook] of [['color','ink'],['background(?:-color)?','fill'],['border(?:-color)?','edge']]) {
      const value=style.match(new RegExp('(?:^|;)'+property+':(?:1(?:\\.5)?px solid )?(#[a-fA-F0-9]+|\\{\\{[^}]+\\}\\})'))?.[1];
      if(value)add('data-pm-'+hook,value);
    }
    const binding=style.match(/(?:^|;)color:\{\{\s*([\w.]+)\s*\}\}/)?.[1];
    let status=statusBindings[binding];
    if(binding==='r.fg')status=style.includes('{{ r.border }}')?(markup.slice(offset,offset+500).includes('{{ r.verdict }}')?'r.verdict':'r.state'):null;
    if(binding==='v.fg'&&!style.includes('{{ v.border }}'))status=null;
    if(status)add('data-pm-status','{{ '+status+' }}');
    const metric=style.match(/(?:color|background):\{\{\s*(s|f)\.(?:fg|accent)\s*\}\}/);
    if(metric&&element!=='button'){add('data-pm-metric','{{ '+metric[1]+'.k }}');if(style.includes('background:'))add('data-pm-metric-mark','true');}
    // Secondary download, utility and dialog controls formerly had their own
    // pale fill. Destructive commands remain a separate semantic action.
    if(/class="[^"]*\b(?:forge-detail-download|forge-profile-secondary|forge-profile-upload|forge-profile-edit-identity|forge-feedback-upload|forge-branch-close|forge-profile-close|forge-review-cta)\b/.test(tag))add('data-pm-secondary','true');
    // Review (legacy repair) and Reroll are the row's primary next action.
    // Reuse the shared filled CTA, including hover, pressed and disabled states.
    if(/class="[^"]*\bcta-(?:repair|reroll)\b/.test(tag)){
      tag=tag.replace(/ data-pm-secondary="true"/,'');add('data-pm-primary','true');
    }
    if(/class="[^"]*\bforge-branch-tree-remove\b/.test(tag))add('data-pm-danger','true');
    // Hover is a control state, not an execution/review status.
    tag=tag.replace(/style-hover="([^"]*)"/g,(_,value)=>'style-hover="'+value.replace(/background(?:-color)?:(?:#[a-fA-F0-9]+|\{\{[^}]+\}\})/g,'background:var(--pm-hover)')+'"');
    return tag;
  }).replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>'<style>'+neutralLegacyCss(css)+'</style>');
}
function neutralLegacyCss(css) {
  const inks=Object.fromEntries(Object.entries(aliases).flatMap(([tone,values])=>values.map(v=>[v,tone])));
  const edges=Object.fromEntries(Object.entries(borders).flatMap(([tone,values])=>values.map(v=>[v,tone+'-border'])));
  // Only declarations with known old UI colors. This leaves charts, icons,
  // author/customer colors and the artifact preview's dark canvas untouched.
  // Old modal scrims, pressed shadows and preview controls also carry green
  // in RGBA neutrals. Remove that hue while preserving their original opacity.
  const neutralRgba = {'24,27,24':26,'28,32,25':31,'32,33,31':33,'20,22,20':21,'245,247,244':246};
  css=css.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/g,(raw,r,g,b)=>{
    const gray=neutralRgba[[r,g,b].join(',')];
    return gray===undefined?raw:`rgba(${gray},${gray},${gray},`;
  });
  return css.replace(/((?:^|[;{])\s*)(color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?)(\s*:\s*)([^;{}]+)/g,(all,prefix,prop,colon,value)=>{
    const normalized=value.replace(/#[a-fA-F0-9]{6}\b/g,raw=>{
      const hex=raw.toLowerCase();
      const token=prop==='color'?(inks[hex]||(neutralInk.includes(hex)?'muted':null)):prop.startsWith('background')?(surfaces.includes(hex)?'subtle':null):(edges[hex]||(neutralEdges.includes(hex)?'border':null));
      return token?'var(--pm-'+token+')':raw;
    });
    return prefix+prop+colon+normalized;
  });
}
export function legacyPaletteCss() {
  const rules=[];
  const rule=(hook,values,property,token)=>rules.push('.forge-postman :is('+values.map(v=>'[data-pm-'+hook+'="'+v+'" i]').join(',')+'){'+property+':var(--pm-'+token+')!important}');
  for(const [tone,values] of Object.entries(aliases))rule('ink',values,'color',tone);
  for(const [tone,values] of Object.entries(borders))rule('edge',values,'border-color',tone+'-border');
  for(const [tone,values] of Object.entries(marks))rule('fill',values,'background-color',tone+'-mark');
  rule('ink',neutralInk,'color','muted');
  rule('edge',neutralEdges,'border-color','border');
  rule('fill',surfaces,'background-color','subtle');
  return '/* Legacy presentation aliases; generated from semantic-colors.mjs. */\n'+rules.join('\n');
}
