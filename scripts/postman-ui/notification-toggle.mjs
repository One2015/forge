export const notificationToggleCopy = [
  [
    `              <div sc-camel-on-click="{{ notif.toggleFeishu }}" style="width:38px;height:22px;flex:none;border-radius:10px;background:{{ notif.feishuBg }};position:relative;cursor:pointer;transition:background .15s">
                <div style="position:absolute;top:2px;left:{{ notif.knobLeft }};width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(34,31,28,.24);transition:left .15s"></div>
              </div>`,
    `              <button type="button" class="pm-notification-switch" role="switch" aria-label="同步到飞书" aria-checked="{{ notif.feishuChecked }}" sc-camel-on-click="{{ notif.toggleFeishu }}">
                <span aria-hidden="true"></span>
              </button>`
  ],
  [
    "      feishuNote: feishuOn ? '飞书未连接 · 当前仅演示同步偏好' : '已关闭 · 只在站内提醒',",
    "      feishuNote: feishuOn ? '飞书未连接 · 当前仅演示同步偏好' : '已关闭 · 只在站内提醒',\n      feishuChecked: feishuOn ? 'true' : 'false',"
  ]
];

export function installNotificationToggle(t) {
  for (const [from, to] of notificationToggleCopy) {
    if (!t.includes(from)) throw Error('Notification toggle anchor changed');
    t = t.replace(from, () => to);
  }
  return t;
}
