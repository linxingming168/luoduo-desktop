// 兴华AI军团矩阵 · 本地数据源
// 修改本文件后，在页面点「更新」即可刷新（纯本地、不联网）。
window.AI_ARMY = {
  groups: [
    {key:"理科", title:"基础理科 7", desc:"理科底座，覆盖数/理/光/声/电/材/热，承接硬件与算法底层问题"},
    {key:"工程", title:"工程制造 2", desc:"把理科结论落地为可制造的机械结构与可控的执行机构"},
    {key:"软件", title:"软件信息 2", desc:"代码与安全，撑起全栈开发与合规防护"},
    {key:"业务", title:"业务特色 2", desc:"贴合兴华自有零售与康养场景的专用智能体"}
  ],
  agents: [
    {cat:"理科", en:"Math",    nm:"数学智能体", rl:"算法设计、数值优化、收益模型与统计推断。", eco:"支撑全体系建模"},
    {cat:"理科", en:"Physics", nm:"物理智能体", rl:"力学与运动学分析，设备动力学校验。", eco:"康养机器人运动"},
    {cat:"理科", en:"Optics",  nm:"光学智能体", rl:"视觉成像与图像理解，海康摄像头 RTSP 接入。", eco:"<b>sy</b> 流媒体 / 摄像头"},
    {cat:"理科", en:"Sound",   nm:"声学智能体", rl:"语音识别、降噪与声场分析。", eco:"康养 / 客服语音"},
    {cat:"理科", en:"Circuit", nm:"电路智能体", rl:"硬件电路设计与信号链路核查。", eco:"售货机 / 控制器"},
    {cat:"理科", en:"Material", nm:"材料智能体", rl:"选材与耐候性评估，降本选型。", eco:"制造 / 外壳"},
    {cat:"理科", en:"Thermal",  nm:"热学智能体", rl:"散热与温控方案设计。", eco:"设备散热"},
    {cat:"工程", en:"Mechanic", nm:"机械智能体", rl:"结构设计与传动机构，设备本体工程。", eco:"售货机 / 机器人"},
    {cat:"工程", en:"Control",  nm:"控制智能体", rl:"运动控制与机器人 MQTT，对接 EMQX。", eco:"<b>cj</b> EMQX 数据采集"},
    {cat:"软件", en:"Code",     nm:"代码智能体", rl:"系统开发、接口联调与自动化脚本。", eco:"<b>jt/sj/tyb/yd</b> 全栈"},
    {cat:"软件", en:"Safe",     nm:"安全智能体", rl:"视频加密、人脸脱敏与合规防护。", eco:"<b>sy</b> 流媒体 / 登登WiFi"},
    {cat:"业务", en:"Retail",   nm:"零售智能体", rl:"同重不同价中台与无人零售运营。", eco:"<b>tyb</b> 挺盈宝 / <b>yd</b> 易得"},
    {cat:"业务", en:"Health",   nm:"康养智能体", rl:"康养机器人与健康服务场景。", eco:"康养机器人 / 论坛"}
  ],
  eco: [
    {host:"tyb.ap100168.com:8006", nm:"挺盈宝无人商店", tag:"Retail + Code"},
    {host:"yd.ap100168.com:8004",  nm:"易得自动售货机", tag:"Retail + Circuit"},
    {host:"登登WiFi",              nm:"免费WiFi领取",   tag:"Safe + Code"},
    {host:"sy.ap100168.com:8007",  nm:"流媒体平台",     tag:"Optics + Safe"},
    {host:"sj.ap100168.com",       nm:"大屏数据平台",   tag:"Code + Retail"},
    {host:"cj.ap100168.com",       nm:"EMQX数据采集",   tag:"Control + Code"},
    {host:"forum_hub",             nm:"论坛社区",       tag:"Retail + Health"},
    {host:"jt.ap100168.com",       nm:"落朵大脑(军团总部)", tag:"SkyDuo 总控 + 全Agent"},
    {host:"康养机器人",            nm:"康养服务终端",   tag:"Health + Control + Physics"}
  ]
};
