# dsh-wsl-obscura
> **套件安装：** 见 [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)。本插件为**可选**（无头引擎），不在 `KIT_SET=daily` 默认集。故障树：[TROUBLESHOOTING.zh.md](https://github.com/173787247/dsh-wsl-kit/blob/master/docs/TROUBLESHOOTING.zh.md)。

DeepSeek Harness 工具：从 **WSL** 调用 **[Obscura](https://github.com/h4ckf0r0day/obscura)**（Rust 无头浏览器）：

| 工具 | 作用 |
|------|------|
| `obscura_status` | 解析二进制并跑 `--version` |
| `obscura_fetch` | `obscura fetch`（dump / eval / stealth） |
| `obscura_mcp_hint` | MCP / CDP 接线说明（不启动服务） |

**不是** [`dsh-wsl-browser`](https://github.com/173787247/dsh-wsl-browser)（`win_open_url` 只打开 Windows **默认 GUI** 浏览器）。

[English → README.md](./README.md)

---

## 为什么需要

要抓正文、跑页面 JS、或 stealth 抓取时，应用无头引擎。本机 Windows 已可编出 `obscura.exe`；插件经 WSL interop（`/mnt/c/.../obscura.exe`）调用。

更完整的 Agent 工具面（导航 / 点击 / 截图 MCP）优先用 **Obscura MCP**（`obscura mcp`），见 `obscura_mcp_hint`。

## 前置

1. Windows 上编好 Obscura（`render,stealth`）。
2. 指定二进制路径（任选）：
   - cordis `config.binaryPath`
   - 环境变量 `OBSCURA_BIN` / `OBSCURA_PATH`
   - 默认候选（本机脚手架路径）：  
     `/mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/obscura/target/release/obscura.exe`

## 安装

本地仓（未发 GitHub 时）：

```sh
dsh plugin --profile web add /mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/dsh-wsl-obscura
```

发布后：

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-obscura
```

装完重启 dsh web（kit：`scripts/restart-dsh-web.sh`）。

## 配置

```yaml
- id: dsh-wsl-obscura
  name: dsh-wsl-obscura
  config:
    timeoutMs: 60000
    maxOutputChars: 32000
    defaultStealth: true
    binaryPath: /mnt/c/Users/rchua/Desktop/AIFullStackDevelopment/obscura/target/release/obscura.exe
```

## 测试

```sh
npm test
```

## 许可

MIT
