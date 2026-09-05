import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const sourceUrl = new URL('public/forge-postman.html', root);
const outputUrl = new URL('public/forge-rbac.html', root);
const opening = '<script type="__bundler/template">';
const closing = '\n</script>\n</body>\n</html>';

const source = fs.readFileSync(sourceUrl, 'utf8');
const start = source.indexOf(opening);
const end = source.indexOf(closing, start);
if (start < 0 || end < 0) throw new Error('Missing Forge bundle template boundary');

const contentStart = start + opening.length;
const encoded = source.slice(contentStart, end).trim();
let template = JSON.parse(encoded);
if (!template.includes('</head>')) throw new Error('Missing Forge template head');

template = template
  .replace('<title>Forge · Postman UI 优化版</title>', '<title>Forge · Role-based Access Prototype</title>')
  .replace(/<body class="([^"]*)"/, (_match, classes) => `<body class="${classes.includes('forge-rbac-prototype') ? classes : `${classes} forge-rbac-prototype`}"`);

if (!template.includes('/postman-ui/rbac-prototype.css')) {
  const assets = [
    '<link rel="stylesheet" href="/postman-ui/rbac-prototype.css">',
    '<script src="/postman-ui/rbac-prototype.js" defer></script>',
  ].join('\n');
  template = template.replace('</head>', `${assets}\n</head>`);
}

const output = source
  .slice(0, contentStart)
  .replace('<title>Forge · Postman UI 优化版</title>', '<title>Forge · Role-based Access Prototype</title>')
  + `\n${JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>')}`
  + source.slice(end);

fs.writeFileSync(outputUrl, output);
console.log(`Forge RBAC Prototype → ${fileURLToPath(outputUrl)}`);
