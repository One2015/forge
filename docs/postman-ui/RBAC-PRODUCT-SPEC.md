# Forge Role-based Access 产品规格（Prototype）

## 1. 产品目标

在不改变 Forge 现有生产、审核与交付流程的前提下，增加可体验、可配置、与平台功能真实联动的角色权限 Prototype。权限不是只展示在 Profile 中；导航、列表数据、页面操作、搜索、通知、统计、下载和直接 URL 访问都必须使用同一套判断。

本期只实现 Forge 界面。Fellow 是独立的外部协作平台；Forge 只展示 External Experts、任务派发、材料开放、同步与回传状态，不制作 Fellow 工作界面。

## 2. 角色模型

角色必须拆成两个维度，不能用一个下拉框混在一起。

### 2.1 平台角色

| 平台角色 | 定义 | 平台管理能力 |
|---|---|---|
| `Admin` | 公司老板或平台管理员 | Forge 最高权限；管理成员、默认权限、成员覆盖权限与全部业务功能 |
| `Internal Member` | CopulaLab 内部成员 | 使用 Forge；不能进入 Member / Permission 管理页 |

个人 Profile 中的平台角色为只读文本，不显示下拉箭头。Admin 如需修改其他内部用户的平台角色，应从 `Member → 成员详情` 完成。

### 2.2 项目角色

| 项目角色 | 可由谁担任 | 定义 |
|---|---|---|
| `Project Owner` | Admin 或 Internal Member | 对某一个 Project 的履约、人员、Skill、外包和最终交付负责 |
| `Member` | Admin 或 Internal Member | 参与某一个 Project 的生产、运行、上传、审核或下载 |
| `External Experts` | Fellow 外部成员 | 只在 Fellow 中处理明确派发的任务包，不能登录 Forge，也不能成为 Project Owner |

同一个内部用户可以在 Project A 是 Project Owner，在 Project B 是 Member。平台 Admin 仍然可以在具体项目中承担 Project Owner 或 Member 职责，但其平台权限始终为最高权限。

Admin 还可以新增自定义项目角色。自定义角色只适用于 Forge 内部成员，不会新增平台角色，也不能替代或绕过 `External Experts` 的 Fellow 强制边界。

## 3. 权限计算

有效权限按以下顺序计算：

1. 平台 Admin：始终拥有 Forge 全部权限。
2. Internal Member：继承当前 Project Role 的默认权限。
3. 若 Admin 对“某个人 + 某个 Project”设置了覆盖，则单项使用 `允许 / 禁止 / 继承` 结果。
4. 最后应用强制安全边界；强制边界不能被默认权限或个人覆盖绕过。

强制边界包括：External Experts 不得登录 Forge、不得成为 Project Owner、不得读取完整项目、内部备注、费用、模型状态、其他成员或未开放材料；无权对象不得出现在搜索、通知标题、数量统计、导出和直接 URL 中。

## 4. 默认项目权限

Admin 在 `Permission` 中分别配置三种项目角色的默认权限。矩阵列为 `View / Create / Modify / Remove`，行按以下模块分组：

- 项目与看板：项目看板、任务与 Item、成员与任务分配。
- 生产：生产与运行、Pipeline、数据集、资源。
- 审核与交付：审核与返工、交付数据单、产物下载。
- 协作与系统：Skill、Fellow 联动、用量与费用、模型状态。

建议默认值：

| 能力 | Project Owner | Member | External Experts |
|---|---|---|---|
| 查看参与项目及看板 | 是 | 是 | 否；仅 Fellow 任务包 |
| 创建和编辑任务 / Item | 是 | 是，限参与范围 | Fellow 中处理派发任务 |
| 分配内部成员和项目角色 | 是 | 否 | 否 |
| 生产、运行、提交、返工 | 是 | 是 | Fellow 中提交与返工 |
| 内部审核 | 是 | 是 | 否 |
| 最终交付 | 是 | 否 | 否 |
| 公共 Pipeline | 查看；复制后编辑 | 查看；复制后编辑 | 否 |
| 自有数据集、资源、Skill | 创建、编辑、删除 | 创建、编辑、删除 | 否 |
| 下载 | 参与项目 | 参与项目 | 仅开放文件 |
| Fellow 派发与共享材料 | 是 | 否 | 只接收任务包 |
| 费用 | 可由 Admin 或 PO 按项目授权 | 仅显式授权 | 否 |
| 模型状态 | 仅显式开放 | 默认否 | 否 |

Admin、Project Owner 和 Member 可对内部产物执行审核，包括自己完成的内部任务；必须保留执行与审核记录。External Experts 不可审核或终审自己的外包提交。

## 5. Profile 信息架构

点击左下角 Profile 后进入完整页面，不再打开弹窗；入口使用主导航一致的 selected state，且不显示误导性的展开箭头。

### 5.1 Internal Member

只显示两个 Tab：

1. `基础信息`
2. `Skill`

### 5.2 Admin

按以下顺序显示四个 Tab：

1. `基础信息`
2. `Member`
3. `Permission`
4. `Skill`

### 5.3 基础信息

- 头像、姓名、邮箱、平台角色在同一行。
- 头像可由本人更换；姓名、邮箱、平台角色只读。
- 平台角色只显示 `Admin` 或 `Internal Member`，使用与邮箱值一致的普通文字样式，不显示标签或下拉箭头。
- 下方是“相关任务列表”，列出所有与当前用户相关的 Project，不论是否为 Project Owner。
- 列为：`Project / 交付单、客户、项目角色、状态、交付时间`。

### 5.4 Skill

- 沿用原 Profile 弹窗中的 Skill 列表和功能，扩展为独立全页 Tab。
- 可切换“全平台 Skill”与“我创建的”。
- Skill 显示名称、调用名、说明、`Owner / User` 关系，以及该 Skill 实际使用过的全部相关任务单；列表和详情均不展示文件或 Skill 类型。
- 所有 Skill 卡片均可进入详情；`User` 关系只读，只有当前用户拥有的 `Owner` Skill 可以编辑名称、调用名和说明。相关任务单来自使用记录，仅供查看。
- “创建 Skill”使用下拉菜单统一承载两个入口：“上传 Skill”和“填写 Skill”。填写入口打开表单；上传入口支持 `.md`、`.markdown` 或含 `SKILL.md` 的 `.zip`。

## 6. Admin：Member

Member 首页包含搜索、成员列表、邀请入口和邀请记录。

成员列表包含：姓名与邮箱、来源（Forge / Fellow）、平台角色、参与项目数、状态。点击姓名进入完整成员详情：

- 查看基础信息和平台角色。
- Internal Member 的平台角色可由 Admin 调整为 Admin 或 Internal Member。
- 查看该成员参与的全部 Project、每个项目的角色和交付时间。
- Admin 可在项目中把内部人员设为 Project Owner 或 Member。
- Fellow 来源的 External Experts 只能保持 External Experts，不能设为 Project Owner。
- 点击“编辑权限”可按 Project 对该成员设置 `继承 / 允许 / 禁止`；External Experts 的覆盖仍受 Fellow 强制边界限制。

## 7. Admin：Permission

- 分别配置 `Project Owner / Member / External Experts` 的默认权限。
- 可通过“新增角色”创建自定义项目角色，填写名称与职责说明，从 `Project Owner`、`Member` 或已有自定义内部角色复制权限后，再按完整权限矩阵逐项调整。
- `Project Owner / Member / External Experts` 是受保护的系统角色；自定义角色会明确标记，并独立保存自己的默认权限。
- 创建成功后，自定义角色立即出现在 Permission 角色列表、内部成员的项目角色下拉框和 Prototype 当前项目角色体验器中。
- External Experts 不能作为自定义内部角色的复制模板，自定义角色也不能赋给 Fellow 外部成员。
- 修改并保存后，Prototype 中相应角色的导航可见性与功能入口立即变化。
- 已存在的个人覆盖不会在默认权限更新后丢失；选择“继承”时应读取最新默认值。
- Prototype 使用浏览器本地存储保存状态，刷新后仍可体验。

## 8. Invite Member 与飞书

邀请入口提供三种身份：`管理员 / 成员 / 外部专家`。管理员和成员创建 Forge 内部邀请；外部专家创建 Fellow 外部协作邀请，不因此获得 Forge 登录权限。

邀请流程：

1. Admin 输入用户邮箱。
2. 选择邀请身份 `管理员 / 成员 / 外部专家`。
3. 可勾选“同步飞书邀请通知”。
4. 提交后出现成功提示，并在邀请记录中显示邮箱、邀请身份、邀请渠道（Forge / Fellow）、状态、飞书状态和有效期。
5. 重复邮箱与非法邮箱需提示，不创建重复记录。

当前为 Prototype，飞书只生成模拟同步记录，界面必须明确标注“未连接真实飞书 API”，不得表现为真实消息已经发送。真实接入后再替换为服务端邀请、飞书账号映射、消息发送、失败重试和审计状态。

## 9. 与 Forge 功能联动

角色变化至少联动以下位置：

- 左侧导航是否可见、可点击及禁用说明。
- Overview、生产、审核、交付、供应商 / Fellow 等模块入口。
- 页面内 Create、Modify、Remove、运行、审核、交付、下载、分配按钮。
- 项目、任务、Pipeline、数据集、资源、Skill 的列表与详情范围。
- 搜索结果、消息标题、未读数、统计总数、费用和模型状态。
- 直接 URL、保存、提交、删除、分配、下载和导出时的二次权限校验。

项目角色决定业务范围；平台角色决定管理入口。Admin 始终拥有最高权限，因此若要观察 Project Owner、Member 或 External Experts 的限制，应先把 Prototype 平台角色切换为 Internal Member。

## 10. Prototype 体验控件

提供独立的 Prototype 角色切换控件，并清晰拆成：

- 平台角色：`Admin / Internal Member`
- 当前项目角色：`Project Owner / Member / External Experts`

切换后立即更新 Profile Tab、左侧导航、禁用状态和访问反馈。选择 Internal Member + External Experts 时，显示 Fellow 安全边界说明，而不是把 Forge 导航变成 Fellow 界面。该控件仅用于演示，不属于正式产品权限提升入口。

## 11. 验收标准

- Prototype 可通过独立命令在 `http://127.0.0.1:3008` 启动，不影响默认 Forge 入口。
- Profile 为完整页面，个人平台角色无下拉箭头。
- Internal Member 仅有基础信息和 Skill；Admin 额外拥有 Member 和 Permission。
- Admin 可配置系统项目角色的默认权限、新增自定义项目角色及其权限，也可按成员、按 Project 覆盖权限。
- 新增自定义项目角色后，无需刷新即可用于内部成员分配和 Prototype 角色切换；对应权限立即联动 Forge 功能状态。
- 内部用户可以在不同项目拥有不同角色；External Experts 永远不能成为 Project Owner。
- 默认权限或角色切换会实际改变 Forge 导航与功能状态。
- Invite Member 支持邮箱校验、管理员 / 成员 / 外部专家三种身份、Forge / Fellow 邀请渠道、记录与飞书模拟同步状态。
- Skill 同时支持全平台 / 我的列表、表单创建和文件上传。
- 相关任务列表含项目角色与交付时间。
- 所有状态刷新后仍保留；真实 API 尚未接入的能力必须明确标注为模拟。
