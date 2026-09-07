// Keep the existing route codec and navigation guards, isolate the review URL.
const PostmanRoutes = (() => {
  const base = '/forge-postman.html';
  function unwrap(input) {
    const u = new URL(input, 'https://forge.invalid');
    if (u.pathname !== base) return input;
    return u.searchParams.has('route') ? u.searchParams.get('route') + u.hash : '/forge.html' + u.search + u.hash;
  }
  function wrap(input) {
    if (input.startsWith(base)) return input;
    const i = input.indexOf('#');
    return base + '?route=' + encodeURIComponent(i < 0 ? input : input.slice(0, i)) + (i < 0 ? '' : input.slice(i));
  }
  function usesAppShell() {
    try {
      return typeof window !== 'undefined' && window.frameElement?.classList?.contains('forge-frame') && window.parent?.location?.origin === window.location?.origin;
    } catch { return false; }
  }
  return { unwrap, wrap, usesAppShell };
})();
const ForgeRoutes = {
  ...ForgeBaseRoutes,
  read: input => {
    const route = ForgeBaseRoutes.read(PostmanRoutes.unwrap(input));
    const params = new URL(PostmanRoutes.unwrap(input), 'https://forge.invalid').searchParams;
    if(route.patch.view === 'review') Object.assign(route.patch, {
      queueType: ['first','rework'].includes(params.get('type')) ? params.get('type') : 'all',
      queueRound: ['1','2','3'].includes(params.get('round')) ? params.get('round') : 'all',
      queuePerson: (params.get('person') || '').slice(0,80) || 'all',
      queueToday: params.get('completed') === 'today', queuePage: Math.max(1, Number(params.get('page')) || 1),
      queuePageSize: [10,20,50].includes(Number(params.get('size'))) ? Number(params.get('size')) : 10
    });
    if(route.patch.view === 'runs') Object.assign(route.patch, {
      runsMetric:['running','review','failed','cost','models'].includes(params.get('metric'))?params.get('metric'):'',
      runsFilter:({queued:'排队中',cancelled:'已取消',completed:'运行完成'})[params.get('status')]||route.patch.runsFilter,
      runsOwner:(params.get('owner')||'').slice(0,80),
      runsPage:Math.max(1,Number(params.get('page'))||1), runsPageSize:[10,20,50].includes(Number(params.get('size')))?Number(params.get('size')):10
    });
    if(route.patch.delCat === '全部') route.patch.delCat = 'all';
    if(['最新','最旧'].includes(route.patch.delSort)) route.patch.delSort = route.patch.delSort === '最旧' ? 'oldest' : 'newest';
    return route;
  },
  write: state => {
    const legacy=ForgeBaseRoutes.defaults().delCat === '全部';
    const normalized=legacy ? {...state, delCat:state.delCat === 'all' ? '全部' : state.delCat, delSort:state.delSort === 'oldest' ? '最旧' : '最新'} : state;
    let route=ForgeBaseRoutes.write(normalized);
    if(state.view === 'review') {
      const u = new URL(route, 'https://forge.invalid');
      for(const [key,value,defaultValue] of [['type',state.queueType,'all'],['round',state.queueRound,'all'],['person',state.queuePerson,'all'],['completed',state.queueToday?'today':'',''],['page',state.queuePage||1,1],['size',state.queuePageSize||10,10]]) {
        if(value != null && value !== defaultValue) u.searchParams.set(key,String(value));
      }
      route=u.pathname+u.search+u.hash;
    }
    if(state.view === 'runs') {
      const u=new URL(route,'https://forge.invalid');
      const status=({'排队中':'queued','已取消':'cancelled','运行完成':'completed','运行失败':'failed'})[state.runsFilter];
      if(status)u.searchParams.set('status',status);
      const owner=String(state.runsOwner||(state.runsMine?'mine':'')).slice(0,80);
      if(owner)u.searchParams.set('owner',owner);else u.searchParams.delete('owner');
      if(state.runsMetric)u.searchParams.set('metric',state.runsMetric);
      if(state.runsPage>1)u.searchParams.set('page',state.runsPage);
      if(state.runsPageSize&&state.runsPageSize!==10)u.searchParams.set('size',state.runsPageSize);
      route=u.pathname+u.search+u.hash;
    }
    return PostmanRoutes.usesAppShell() ? route : PostmanRoutes.wrap(route);
  },
};
