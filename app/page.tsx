import ForgeFrame from './forge-frame';

export default function Page() {
  const rbacPrototype = process.env.FORGE_RBAC_PROTOTYPE === '1';
  return (
    <ForgeFrame
      source={rbacPrototype ? '/forge-rbac.html' : '/forge-postman.html'}
      title={rbacPrototype ? 'Forge · Role-based Access Prototype' : 'Forge · Postman UI 优化版'}
    />
  );
}
