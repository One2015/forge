# Pipeline 节点详情与问题同步

节点详情从右侧打开。Pipeline 所有者以及管理员（现有 Lead / 接入方的 admin）可在编辑路由修改节点，保存为新版本；普通成员和 `/view` 路由保持只读。节点编辑保留历史版本与运行记录。

## 失败数据

接入方通过 `pipelineNodeExecutions` 提供节点执行快照数组：

```js
{
  pipeline: 'web3d-ant-delivery-v1',
  version: 'v16',
  runId: 'run-id',
  itemId: 'item-id',
  node: 'prep_task',
  status: 'failed',
  occurredAt: '2026-09-04T09:00:00Z',
  attempt: 1,
  error: { code: 'INPUT_VALIDATION_FAILED', message: '缺少 subject 字段' }
}
```

也读取现有 `itemExecution[itemId][runId].nodes` 和包含具体节点名称的 `runItemTech`。不从运行总失败数量推断失败节点。按 Pipeline、版本、运行、Item 和节点隔离记录，较新的成功快照会清除对应失败标记。

没有执行数据时，蚂蚁 Pipeline 的 `prep_task` 展示一条明确标注为“示例”的失败记录，Run ID 为 `demo-ant-prep-failure`。提供 `pipelineNodeExecutions: []` 可关闭示例；真实数据优先。

## 飞书接入状态

按用户要求，当前目标为未来新建的 **Forge任务报错群**，尚未连接机器人。点击“同步问题”提示“尚未接入，问题暂未发送”，不会发出网络请求。

未来接入时，宿主提供 `syncPipelineNodeIssue({ groupName, issue })` 异步回调，由服务端保存群机器人的凭证并发送消息。`issue` 只包含页面展示的节点、版本、Run / Item ID、时间、错误原因、重试序号和示例标记，不包含节点配置、Prompt 或其他 Item 数据。

- 仅收到 `{ ok: true }` 后显示“已同步”。
- 明确失败返回 `{ ok: false, message }`，允许重试。
- 不确定是否已投递返回 `{ ok: false, code: 'delivery_unknown' }`；抛错或缺少回执也视为结果未知，提示先检查群消息，避免盲目重试。
- 同一页面内防止重复发送；服务端接入时需对完整事件身份做持久幂等处理，并沿用实际登录与群消息发送权限。

参考：[飞书自定义机器人文档](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)。当前版本不包含外部发送接口或机器人凭证。
