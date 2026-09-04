# Pipeline 历史和配置上传

展开 Pipeline 显示当前版本至 v1 的完整版本列表。现有数据未提供说明或时间的旧版本显示“暂无更新说明”和“—”，不生成历史内容。

Owner 在“编辑 Pipeline”中上传 `.yaml`、`.yml` 或 `.json`（非空，最大 5 MiB）。上传先替换草稿节点，可继续用表单修改；“保存新版本”才提交。取消、解析失败、关闭编辑后才读完的文件都不修改已有版本。保存沿用原 Pipeline ID、Owner 和版本序列，保留旧版本快照和已有运行记录。数据仍沿用当前原型的内存存储。

支持的主要格式（“下载示例”也提供此结构）：

```yaml
description: 更新生成流程
nodes:
  - name: prepare
    type: FUNCTION
    enabled: true
    config:
      fn: prep_task
  - name: build
    type: AGENT
    config:
      model: your-model
      max_iterations: 8
```

- `nodes` 支持对象列表或以节点名称为键的映射，1–500 个节点；至少启用一个。
- 类型支持 FUNCTION、AGENT、LLM、REVIEW，大小写均可；节点名称唯一。
- 配置建议放入 `config`。节点上的其他字段（如 `model`、`prompt`）也会归入配置；重复配置键会报错。
- 兼容 `dag: ["prepare/FUNCTION"]` 配合 `nodeConfigs`、`enabledNodes`。
- 文件的名称、ID、Owner、版本和历史不会覆盖现有身份与版本信息。其他顶层参数保存在 `pipelineOptions`，后续表单编辑保留。
- YAML 使用 JS-YAML 4.3.2 CORE schema，限制嵌套和展开规模，拒绝循环引用、重复 YAML 键、未知类型和多文档。

解析器从项目已有安装版本 vendored 到 `scripts/postman-ui/vendor/js-yaml.min.js`，MIT 许可证见同目录 `js-yaml.LICENSE`；生成器将其打包进独立预览，不依赖 CDN。
