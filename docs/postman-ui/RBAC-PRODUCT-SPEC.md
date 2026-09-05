# Forge Role-based Access Control 产品规格

## 1. 目标与范围

Forge 只有两种平台账号角色：`Admin` 与 `Internal Member`。项目内另有 `Admin`、`Project Owner`、`Member`、`Outsourcing` 四种任务角色。`Outsourcing` 属于独立平台 Fellow，不作为 Forge 登录账号。本期只设计 Forge 的权限、Profile 全页和 Fellow 联动信息，不设计 Fellow 界面。

权限判断由三层共同决定：

1. **平台角色**：决定用户是否可以管理账号资料及平台 Accessibility。
2. **项目角色**：决定用户在每一张交付单中的职责与操作范围。
3. **对象关系**：决定用户能访问哪些交付单、Pipeline、数据集、资源和 Skill。
4. **显式授权**：决定项目费用、特殊资源或具体任务的额外访问权。

`Project Owner` 是交付单级职责，不是平台账号角色。Admin 和 Internal Member 都可以成为某张交付单的 Project Owner；一个用户可以在 A 交付单是 Project Owner，在 B 交付单仅作为 Member。Outsourcing 不可以成为 Project Owner。

## 2. 平台角色

### Admin

Forge 最高权限角色，拥有全部项目、数据和功能权限，可代替其他内部角色执行操作。

- 管理组织成员、账号角色和 Project Owner。
- 查看、创建、编辑、归档和删除全部交付单。
- 分配、改派和撤销全部生产、审核及 Fellow 外包任务。
- 查看与管理全部 Pipeline、数据集、资源和 Skill。
- 发起、取消和重试全部运行。
- 审核、返工、确认与最终交付。
- 查看公司级和项目级费用、用量及模型状态。
- 管理 Fellow 集成、共享材料规则和权限审计。

### Internal Member

CopulaLab 内部账号。可以正常使用 Forge，但不能修改个人平台角色或平台 Accessibility。

- 查看自己的个人信息、平台角色和 Accessibility，但这些字段全部只读。
- 可以创建和管理本人拥有的数据集、资源、Skill 和 Pipeline 副本。
- 实际项目权限由其在每张交付单中的项目角色决定。
- 可以被设置为 Project Owner 或 Member。

## 3. 项目与任务角色

### Admin

平台 Admin 介入项目时的任务角色，拥有该项目全部操作权限。

### Project Owner

负责一张交付单的完整履约结果。Admin 或 Internal Member 都可以担任。

- 编辑交付单要求、截止时间和验收标准。
- 管理交付单 Skill、参与人员和任务角色。
- 分配内部任务及 Fellow 外包任务。
- 生产、运行、审核、返工和确认最终交付。
- 查看本人负责项目的费用与用量。

### Member

项目中的内部参与者，可以由平台 Admin 或 Internal Member 担任。

- 查看本人参与的交付单及必要上下文。
- 生产与运行，提交结果、处理返工并上传相关 Case 图片。
- 创建、编辑和删除本人拥有的数据集、资源、Skill 和 Pipeline 副本。
- 审核内部任务，包括本人完成的任务。
- 查看、预览和下载本人参与项目的交付内容。
- 默认不能管理交付单成员、角色、Fellow 分配或最终交付。
- 默认不显示模型状态。
- 只有获得项目级显式授权时才能查看相应项目费用；未授权项目的费用及公司汇总不可见。

### Outsourcing / Fellow

外包人员只在 Fellow 工作，不登录 Forge。Forge 仅维护外包人员引用、任务分配、同步状态和回传结果。

- 只能访问 Admin 或 Project Owner 明确分配的任务包和开放材料。
- 可提交工作与处理返工。
- 不得在 Forge 审核或终审自己的提交。
- 不得访问完整交付单、内部备注、费用、模型状态、其他成员任务或未开放资源。

## 4. 任务职责

“执行人”和“审核人”是具体任务职责，不是账号角色。

- Project Owner 与 Member 都可以承担生产、运行和内部审核。
- Project Owner 额外负责整张交付单的 Skill、角色分配、外包分配和最终交付。
- Member 可以基于相关 Case 上传图片、提交结果并下载参与项目的交付内容。
- Admin、Project Owner 和 Member 允许审核自己完成的内部任务；审计记录必须保留执行与审核身份。
- Outsourcing 不能审核或终审自己的外包提交，必须回到 Forge 由内部人员验收。

## 5. 权限矩阵

### 平台权限

| 功能 | Admin | Internal Member |
|---|---|---|
| 查看个人基础信息 | 是 | 是 |
| 编辑自己的姓名等基础信息 | 是 | 否 |
| 修改用户的平台角色 | 是 | 否 |
| 编辑平台 Accessibility | 是 | 否，只读查看自己的权限 |
| 管理组织成员 | 是 | 否 |
| 查看自己的相关项目与 Skill | 是 | 是 |

### 项目权限

| 功能 | Admin | Project Owner | Member | Outsourcing / Fellow |
|---|---|---|---|---|
| 查看交付单 | 全部 | 负责与参与 | 参与 | 仅任务包 |
| 创建交付单 | 是 | 是 | 否，除非后续显式开放 | 否 |
| 编辑/归档/删除交付单 | 全部 | 本人负责 | 否 | 否 |
| 管理成员与任务角色 | 全部 | 本人负责交付单 | 否 | 否 |
| 生产与运行 | 全部 | 本人负责或参与 | 本人参与 | Fellow 内执行 |
| 取消他人运行 | 全部 | 本人负责交付单 | 否 | 否 |
| 上传相关 Case 图片 | 是 | 是 | 是 | 仅任务包允许的提交 |
| 内部审核与返工 | 全部 | 本人负责或参与 | 被分配或参与 | 否 |
| 审核本人内部任务 | 是 | 是 | 是 | 否 |
| 最终交付 | 全部 | 本人负责交付单 | 否 | 否 |
| 查看公共 Pipeline | 全部 | 是 | 是 | 否 |
| 原地编辑公共 Pipeline | 是 | 否 | 否 | 否 |
| 复制 Pipeline 后编辑/删减 | 是 | 是 | 是，保存为本人资源 | 否 |
| 创建/编辑自己的数据集、资源和 Skill | 是 | 是 | 是 | 否 |
| 下载参与项目交付内容 | 是 | 是 | 是 | 仅明确开放文件 |
| 查看费用 | 公司与全部项目 | 本人负责项目 | 显式授权项目 | 否 |
| 查看模型状态 | 是 | 是 | 否 | 否 |
| 分配或改派 Fellow 外包 | 是 | 本人负责交付单 | 否 | 否 |
| 设置 Fellow 共享材料 | 是 | 本人负责交付单 | 否 | 否 |
| 管理组织角色和权限 | 是 | 否 | 否 | 否 |
| 查看权限审计 | 全部 | 本人负责范围 | 本人相关记录 | 否 |

## 6. 费用权限

费用是独立的显式授权，不由 Member 身份自动获得。

- Admin：公司汇总、全部项目、供应商和模型维度。
- Project Owner：本人负责项目的费用与用量。
- Member：Admin 或 Project Owner 可以按项目授权“可查看费用”；不得查看公司汇总或未授权项目。
- Outsourcing：不可查看任何 Forge 费用。
- Member 即使获得费用访问权，仍不显示“模型状态”；费用数据和系统模型状态是两项权限。

## 7. Fellow 联动权限

只有 Admin 和当前交付单的 Project Owner 可以：

- 选择 Fellow 外包人员。
- 派发、改派、撤销外包任务。
- 配置向 Fellow 开放的输入文件、要求、参考资料和验收标准。
- 查看并重试同步失败。
- 接收提交、发起返工和完成内部验收。

Forge 设置页仅展示 Fellow 的连接状态、用户关联、相关外包任务和用户能够执行的联动操作。本期不实现 Fellow 界面。

## 8. Profile 全页信息架构

点击左下 Profile 后不再打开弹窗，而是进入完整 Profile 页面。左下 Profile 按钮保持明确的 clicked / selected 状态。页面仅使用两个 Tab：

1. **Profile**
   - 页面标题 `Profile` 与“编辑资料”位于同一行：“编辑资料”固定在标题行最右侧；基础信息区不再重复放置操作按钮。
   - 个人基础信息使用单行结构：头像、姓名、邮箱和平台角色在同一行展示。
   - Internal Member 查看但不能修改；Admin 可以编辑。
   - 紧接“Platform Accessibility”，展示当前用户在 Forge 中可访问的模块和数据范围。
   - Accessibility 参考 Genova Lab 的权限矩阵，列为 `权限范围 / Create / Modify / Remove / View`。
   - 权限范围按“组织与成员、项目与生产、审核与交付、费用与系统”分组，支持展开查看子功能。
   - 用量与费用、模型状态属于 View-only，不提供 Create、Modify、Remove。
   - Accessibility 只有 Admin 可以编辑并保存；Internal Member 看到同一矩阵，但全部只读。
   - 页面最下方为“参与的 Project”，列出所有与当前用户相关的交付单，不论其是否为 Project Owner。
   - 每一行独立显示该用户在这张交付单中的项目角色：Admin、Project Owner、Member 或 Outsourcing。
2. **Skill**
   - 沿用原 Profile 弹窗中的 Skill 内容和操作方式，扩展为全页列表。
   - 列出当前用户生成、上传或使用过的全部 Skill。
   - 每项保留 Skill 名称、调用名、说明、关联数据单、文件类型和原操作入口。
   - 每一项显示关系标签：`Owner` 表示用户拥有、生成或上传，`User` 表示用户使用过。
   - 保留“上传 Skill”、命名、关联数据单和查看数据单能力。

Profile clicked state 使用与主导航一致的中性选中底色、橙色定位标记和清晰焦点，不再显示会打开弹窗的展开箭头。Prototype 的账号切换是独立演示控件，不允许用户通过 Profile 自行提升平台角色。

## 9. 强制访问控制规则

- 左侧导航、页面数据、搜索结果、通知、数量统计和导出内容使用同一权限范围。
- 直接访问 URL、读取详情和下载文件必须重新校验对象权限。
- 保存、提交、删除、分配和导出时再次校验，避免打开页面后权限已被撤销。
- 角色、Owner、费用授权、Fellow 共享材料和导出行为必须写入审计记录。
- 权限撤销后立即阻止新操作，但保留历史提交和审计记录。
- 未知角色和缺失授权默认拒绝访问。

## 10. Prototype 验收标准

- 可切换平台 Admin 与 Internal Member 账号体验。
- Profile 点击后进入全页而不是弹窗，左下入口显示正确 selected state。
- Profile 页面只有 `Profile` 与 `Skill` 两个 Tab。
- Admin 可以编辑基础信息、平台角色和 Accessibility；Internal Member 只读。
- 参与的 Project 位于 Profile 页最下方，列出用户所有相关交付单并逐行显示项目角色。
- Skill 独立成 Tab，沿用原弹窗内容，列出用户生成、上传或使用过的内容并显示 Owner / User 关系。
- 切换账号后导航、数据范围、按钮、费用和模型状态同步变化。
- Admin 展示全部功能，不出现权限限制。
- Project Owner 可以复制公共 Pipeline，再编辑或删减项目副本。
- Member 可以生产、运行、上传 Case、审核内部任务、下载参与项目内容和管理自己的资源。
- Member 只有在获得项目授权后看到对应费用，始终不显示模型状态。
- 只有 Admin 与 Project Owner 出现 Fellow 分配和共享材料管理入口。
- Profile 能解释当前用户的平台权限及每一个项目、Skill 的关系。
- 不创建 Fellow 界面。
