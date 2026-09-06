import type { Metadata } from 'next';
export { default } from '../page';

export async function generateMetadata({ params }: { params: Promise<{ route: string[] }> }): Promise<Metadata> {
  const { route } = await params;
  const names: Record<string, string> = { overview: '概览', production: '生产', runs: '运行记录', pipelines: 'Pipeline', datasets: '数据集', resources: '资源', review: '审核', pending: '待审核', results: '审核结果', delivery: '交付', new: '创建数据单', edit: '编辑', items: 'Item 详情', billing: '用量与费用', projects: '项目', suppliers: '供应商', models: '模型', profile: 'Profile' };
  const title = route.slice(0, 2).map(part => names[part] || part.slice(0, 80)).join(' · ') + ' | Forge';
  return { title, description: 'Forge 生产、审核与交付工作台。', openGraph: { title, images: [] }, twitter: { title, images: [] } };
}
