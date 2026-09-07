// forge-routing-core:start
// Pure route codec. URLs contain navigation only, never form contents or decisions.
const ForgeRoutes = (() => {
  const oneOf = (value, options, fallback) => options.includes(value) ? value : fallback;
  const enc = value => encodeURIComponent(String(value));
  const defaults = () => ({
    view: 'overview', openPipe: null, editPipe: null, editSel: null,
    selDs: null, dsVersion: null, dsVersions: false, runPipeline: null, picked: {},
    activeRun: null, runIds: [], reviewRun: 'all', reviewOpen: null, deepReview: null, reviewReturn: null,
    reviewOwner: 'all', reviewPhase: 'pending', reviewSort: 'newest', reviewQuery: '', reviewTab: '预览',
    sheetKey: null, sheetRow: null, sheetFilter: 'all', sheetQuery: '', sheetTagFilter: '',
    lifeItem: null, lifeRun: null, lifeDs: null, lifeFrom: null, lifeBranch: null,
    pipeFilter: '活跃', pipeQuery: '', dsQuery: '', runsFilter: '全部', runsMine: false, runsQuery: '',
    delCat: 'all', delStatus: 'all', delSort: 'newest', billing: undefined,
    modelQuery: '', modelProvider: '', modelModel: '', modelLine: '', modelFilter: 'production', modelDimension: 'providers', modelSelection: '', modelRoute: '', modelSource: '', modelSort: 'impact', modelTimeRange: 'all', modelTimeStart: '', modelTimeEnd: '', modelDrawerMode: '', modelChartMetric: 'ttft', modelNoteOpen: false, modelPageTab: 'overview', modelOverviewWindow: '1h',
    supplierTab: 'performance', supplierVendor: '', supplierSheet: '', supplierRisk: '', supplierCycle: 'all', supplierAddOpen: false,
    dlOpen: false, notifOpen: false, profileOpen: false, profileTab: 'tasks',
    routeAnchor: '', routeError: '', routeMissingUrl: '',
  });
  function read(input) {
    const patch = defaults();
    const result = { patch, editor: null, draft: '', error: '' };
    try {
      if (typeof input !== 'string' || input.length > 8192 || !input.startsWith('/') || input.startsWith('//')) throw Error('path');
      const url = new URL(input, 'https://forge.invalid');
      if (url.origin !== 'https://forge.invalid' || /[\\\x00-\x1f]/.test(input)) throw Error('origin');
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (parts.some(part => !part || part.length > 300 || /[\x00-\x1f/\\]/.test(part))) throw Error('segment');
      const q = url.searchParams, get = key => (q.get(key) || '').slice(0, 300);
      const query = get('q');
      patch.routeAnchor = decodeURIComponent(url.hash.slice(1)).slice(0, 160);
      if (/[\x00-\x1f]/.test(patch.routeAnchor)) throw Error('anchor');
      // Old root and screenshot links remain usable, without replaying actions.
      if (!parts.length || parts.length === 1 && parts[0] === 'forge.html') {
        const legacy = get('view');
        if (legacy) {
          const legacyState = Object.assign(defaults(), {
            view: oneOf(legacy, ['overview', 'pipelines', 'pipeedit', 'datasets', 'runs', 'run', 'review', 'delivery', 'sheet', 'itemlife', 'resources', 'models', 'billing'], 'overview'),
            activeRun: get('activeRun'), selDs: get('selDs'), sheetKey: get('sheetKey'),
            sheetRow: get('item'), lifeItem: get('item'), reviewOpen: get('reviewKey'),
          });
          return read(write(legacyState));
        }
      } else if (parts[0] === 'overview' && parts.length === 1) {
        patch.view = 'overview';
      } else if (parts[0] === 'production') {
        const section = parts[1] || 'runs', id = parts[2];
        if (section === 'runs' && parts.length <= 3) {
          patch.view = id ? 'run' : 'runs'; patch.activeRun = id || null;
          patch.runsQuery = query; patch.runsMine = get('owner') === 'mine';
          patch.runsFilter = ({ running: '运行中', success: '成功', failed: '失败' })[get('status')] || '全部';
        } else if (section === 'submitted' && parts.length === 2) { patch.view = 'submitted'; patch.activeRun = get('run') || null; }
        else if (section === 'pipelines' && parts.length <= 4 && (!parts[3] || parts[3] === 'edit') && (!parts[3] || id)) {
          patch.view = parts[3] ? 'pipeedit' : 'pipelines';
          patch.openPipe = id || null; patch.editPipe = parts[3] ? id : null;
          patch.editSel = get('node') || null; patch.pipeQuery = query;
          patch.pipeFilter = ({ all: '全部', archived: '废弃', active: '活跃' })[get('status')] || (id ? '全部' : '活跃');
        } else if (section === 'datasets' && parts.length <= 3) {
          patch.view = 'datasets'; patch.selDs = id || null; patch.dsQuery = query;
          patch.dsVersion = get('version') || null; patch.runPipeline = get('pipeline') || null;
        } else if (section === 'resources' && parts.length === 2) patch.view = 'resources';
        else throw Error('production');
      } else if (parts[0] === 'review') {
        patch.view = 'review'; patch.reviewOwner = get('owner') === 'mine' ? 'mine' : 'all';
        patch.reviewSort = get('sort') === 'oldest' ? 'oldest' : 'newest'; patch.reviewQuery = query;
        patch.reviewRun = get('run') || 'all';
        if (parts.length === 1 || parts.length === 2 && ['pending', 'results'].includes(parts[1])) patch.reviewPhase = parts[1] === 'results' ? 'done' : 'pending';
        else if (parts.length === 4 && parts[2] === 'items') {
          patch.reviewRun = parts[1]; patch.reviewOpen = parts[1] + ':' + parts[3];
          patch.deepReview = { runId: parts[1], itemId: parts[3] };
          patch.reviewPhase = get('phase') === 'results' ? 'done' : 'pending';
        } else throw Error('review');
        patch.reviewTab = get('tab') === 'files' ? '文件' : '预览';
      } else if (parts[0] === 'delivery') {
        patch.view = 'delivery';
        patch.delCat = oneOf(get('category'), ['Web3D', 'Vision2Web', '金融', 'WebDev'], 'all');
        patch.delStatus = get('status') === 'unmet' ? 'unmet' : 'all';
        patch.delSort = get('sort') === 'oldest' ? 'oldest' : 'newest';
        if (parts.length === 2 && parts[1] === 'new') {
          patch.view = 'delivery-create'; result.editor = { key: null, tab: oneOf(patch.routeAnchor, ['basic', 'list', 'skills', 'confirm'], 'basic') }; result.draft = get('draft');
        } else if (parts.length >= 2) {
          patch.view = 'sheet'; patch.sheetKey = parts[1];
          patch.sheetQuery = query; patch.sheetFilter = oneOf(get('status'), ['all', 'passed', 'review', 'failed'], 'all'); patch.sheetTagFilter = get('tag');
          if (parts.length === 3 && parts[2] === 'edit') result.editor = { key: parts[1], tab: patch.routeAnchor === 'tags' ? 'list' : oneOf(patch.routeAnchor, ['basic', 'list', 'skills', 'reviewers'], 'basic') };
          else if (parts.length === 4 && parts[2] === 'items') patch.sheetRow = parts[3];
          else if (parts.length !== 2) throw Error('delivery');
        }
      } else if (parts[0] === 'items' && parts.length === 2) {
        patch.view = 'itemlife'; patch.lifeItem = parts[1]; patch.lifeRun = get('run') || null;
        patch.sheetKey = get('sheet') || null; patch.lifeFrom = get('from') === 'review' ? 'review' : 'sheet';
      } else if (parts[0] === 'billing' && parts.length <= 2 && (!parts[1] || ['overview', 'projects', 'suppliers', 'models'].includes(parts[1]))) {
        patch.view = 'billing'; patch.billing = { tab: parts[1] === 'projects' ? 'overview' : parts[1] || 'overview', project: get('project'), provider: get('provider'), model: get('model'), sort: oneOf(get('sort'), ['cost', 'share', 'tokens', 'input', 'output', 'calls', 'name'], 'cost'), direction: oneOf(get('direction'), ['asc', 'desc'], 'desc'), metric: oneOf(get('metric'), ['cost', 'tokens', 'calls'], 'cost'), query: get('search'), page: Math.max(1, Math.min(10000, Number(get('page')) || 1)), pageSize: oneOf(get('pageSize'), ['5', '10', '20', '50'], '10'), bin: get('bin') || null };
        if (get('preset')) patch.billing.preset = oneOf(get('preset'), ['yesterday', 'week', 'month', 'year', 'years', 'custom'], 'yesterday');
        for (const key of ['start', 'end']) if (q.has(key)) patch.billing[key] = get(key);
        if (get('grain')) patch.billing.grain = oneOf(get('grain'), ['hour', 'day', 'month', 'year'], 'day');
      } else if (parts[0] === 'models' && parts.length === 1) {
        patch.view = 'models'; patch.modelQuery = query; patch.modelProvider = get('provider');
        patch.modelModel = get('model'); patch.modelLine = get('line');
        patch.modelFilter = oneOf(get('status'), ['production', 'attention', 'severe', 'performance', 'normal', 'failed', 'slow', 'quality', 'billing', 'unknown', 'available', 'inactive', 'supplier_balance', 'key_unavailable', 'account_shortage', 'downstream_error'], 'production');
        patch.modelDimension = oneOf(get('dimension'), ['providers', 'models'], 'providers');
        patch.modelSelection = get('selection'); patch.modelRoute = get('route'); patch.modelSource = get('source') === 'live' ? 'live' : '';
        patch.modelSort = oneOf(get('sort'), ['impact', 'severity', 'latency', 'errors', 'balance', 'updated'], 'impact');
        patch.modelTimeRange = oneOf(get('period'), ['all', '1h', '24h', '7d', '30d', 'custom'], 'all'); patch.modelTimeStart = get('from'); patch.modelTimeEnd = get('to');
        patch.modelDrawerMode = oneOf(get('drawer'), ['diagnostic', 'test', 'billing'], ''); patch.modelChartMetric = oneOf(get('metric'), ['ttft', 'throughput', 'total', 'errors'], 'ttft'); patch.modelPageTab = oneOf(get('tab'), ['overview', 'lines'], get('tab') === 'compare' ? 'lines' : 'overview'); patch.modelOverviewWindow = oneOf(get('window'), ['1h', '24h', '7d', '30d'], '1h');
      } else if (parts[0] === 'outsourcing-suppliers' && parts.length <= 2) {
        patch.view = 'outsourcing-suppliers'; patch.supplierVendor = parts[1] || get('supplier');
        patch.supplierTab = oneOf(get('tab'), ['performance', 'management'], 'performance'); patch.supplierSheet = get('sheet');
        patch.supplierRisk = oneOf(get('risk'), ['critical', 'high', 'medium', 'low'], ''); patch.supplierCycle = oneOf(get('cycle'), ['all', '7d', '30d', 'quarter'], 'all');
      } else if (parts[0] === 'profile' && parts.length === 1) {
        patch.view = 'profile';
      } else if (parts[0] === 'members' && parts.length === 1) {
        patch.view = 'members';
      } else throw Error('route');
      // Legacy profile-panel links now resolve to the first-class Profile page.
      if (get('panel') === 'profile') patch.view = 'profile';
      patch.profileOpen = false; patch.profileTab = get('profile') === 'skills' ? 'skills' : 'tasks';
      patch.dlOpen = get('panel') === 'downloads'; patch.notifOpen = get('panel') === 'notifications';
      return result;
    } catch {
      result.error = '这个页面地址无效，请从导航重新进入。';
      const safePath = typeof input === 'string' && input.length <= 8192 && /^\/(?![\/\\])/.test(input) && !/[\x00-\x1f]/.test(input);
      result.patch = Object.assign(defaults(), { view: 'route-error', routeError: result.error, routeMissingUrl: safePath ? input : '/not-found' });
      return result;
    }
  }
  function write(s) {
    const q = new URLSearchParams(); let path = '/overview', anchor = s.routeAnchor || '';
    const set = (key, value, fallback = '') => { if (value != null && value !== '' && String(value) !== String(fallback)) q.set(key, String(value)); };
    switch (s.view) {
      case 'runs': path = '/production/runs'; set('status', ({'运行中':'running','成功':'success','失败':'failed'})[s.runsFilter]); set('owner', s.runsMine ? 'mine' : ''); set('q', s.runsQuery); break;
      case 'run': path = '/production/runs/' + enc(s.activeRun || 'missing'); break;
      case 'submitted': path = '/production/submitted'; set('run', s.activeRun); break;
      case 'pipelines': path = '/production/pipelines' + (s.openPipe ? '/' + enc(s.openPipe) : ''); set('status', ({'全部':'all','废弃':'archived'})[s.pipeFilter]); set('q', s.pipeQuery); break;
      case 'pipeedit': path = '/production/pipelines/' + enc(s.editPipe || 'missing') + '/edit'; set('node', s.editSel); break;
      case 'datasets': path = '/production/datasets' + (s.selDs ? '/' + enc(s.selDs) : ''); set('version', s.dsVersion); set('pipeline', s.runPipeline); set('q', s.dsQuery); break;
      case 'resources': path = '/production/resources'; break;
      case 'review': {
        const deep = s.reviewOpen, split = deep?.indexOf(':');
        path = deep && split > 0 ? '/review/' + enc(deep.slice(0, split)) + '/items/' + enc(deep.slice(split + 1)) : '/review/' + (s.reviewPhase === 'done' ? 'results' : 'pending');
        if (deep) { set('phase', s.reviewPhase === 'done' ? 'results' : ''); set('tab', s.reviewTab === '文件' ? 'files' : ''); } else set('run', s.reviewRun, 'all');
        set('owner', s.reviewOwner, 'all'); set('sort', s.reviewSort, 'newest'); set('q', s.reviewQuery); break;
      }
      case 'delivery': path = '/delivery'; set('category', s.delCat, 'all'); set('status', s.delStatus, 'all'); set('sort', s.delSort, 'newest'); break;
      case 'delivery-create': path = '/delivery/new'; set('draft', s.deliveryEditor?.savedDraftId); anchor = s.deliveryEditor?.tab || 'basic'; break;
      case 'sheet': path = '/delivery/' + enc(s.sheetKey || 'missing') + (s.sheetRow ? '/items/' + enc(s.sheetRow) : ''); set('status', s.sheetFilter, 'all'); set('q', s.sheetQuery); set('tag', s.sheetTagFilter); break;
      case 'itemlife': path = '/items/' + enc(s.lifeItem || 'missing'); set('run', s.lifeRun); set('sheet', s.sheetKey); set('from', s.lifeFrom === 'review' ? 'review' : ''); break;
      case 'billing': path = '/billing/' + (s.billing?.tab === 'projects' ? 'overview' : s.billing?.tab || 'overview'); for (const key of ['preset', 'start', 'end', 'grain', 'project', 'provider', 'model', 'bin']) set(key, s.billing?.[key]); set('sort', s.billing?.sort, 'cost'); set('direction', s.billing?.direction, 'desc'); set('metric', s.billing?.metric, 'cost'); set('search', s.billing?.query); set('page', s.billing?.page, '1'); set('pageSize', s.billing?.pageSize, '10'); break;
      case 'models': path = '/models'; set('q', s.modelQuery); set('provider', s.modelProvider); set('model', s.modelModel); set('line', s.modelLine); set('status', s.modelFilter, 'production'); set('dimension', s.modelDimension, 'providers'); set('selection', s.modelSelection); set('route', s.modelRoute); set('source', s.modelSource); set('sort', s.modelSort, 'impact'); set('period', s.modelTimeRange, 'all'); if (s.modelTimeRange === 'custom') { set('from', s.modelTimeStart); set('to', s.modelTimeEnd); } set('drawer', s.modelDrawerMode); set('metric', s.modelChartMetric, 'ttft'); set('tab', s.modelPageTab, 'overview'); set('window', s.modelOverviewWindow, '1h'); break;
      case 'outsourcing-suppliers': path = '/outsourcing-suppliers' + (s.supplierVendor ? '/' + enc(s.supplierVendor) : ''); set('tab', s.supplierTab, 'performance'); set('sheet', s.supplierSheet); set('risk', s.supplierRisk); set('cycle', s.supplierCycle, 'all'); break;
      case 'profile': path = '/profile'; break;
      case 'members': path = '/members'; break;
      case 'route-error': return s.routeMissingUrl || '/not-found';
    }
    if (s.deliveryEditor?.key) { path = '/delivery/' + enc(s.deliveryEditor.key) + '/edit'; anchor = anchor || s.deliveryEditor.tab || 'basic'; }
    if (s.dlOpen) set('panel', 'downloads'); else if (s.notifOpen) set('panel', 'notifications');
    return path + (q.size ? '?' + q.toString() : '') + (anchor ? '#' + enc(anchor) : '');
  }
  return { read, write, defaults };
})();
// forge-routing-core:end
