# 粤音智标

QQ 音乐粤拼自动标注器，支持繁简体、粤语口语字、LRC 时间轴、逐字校对和导出。网页与 Apple App 均在本机完成粤拼转换，不上传歌词。

## macOS 与 iOS App

同一套 SwiftUI 工程支持 macOS 13+ 和 iOS 16+。界面和完整粤拼词库均离线打包：

- macOS 可直接保存 `.lrc` 文件；
- iOS 通过系统分享菜单导出 `.lrc`；
- 无需登录，不依赖线上网页；
- GitHub Actions 自动生成通用 macOS 应用包和未签名 iOS IPA。

## 下载与安装

在 GitHub Releases 下载：

- `粤音智标-macOS-universal.zip`：支持 Apple 芯片和 Intel Mac；
- `粤音智标-iOS-unsigned.ipa`：需用 AltStore、Sideloadly 或 Apple 开发者证书签名后安装。

iOS 不允许分发可直接安装的通用未签名应用。若需要 App Store 或 TestFlight 版本，请在 Xcode 中配置自己的开发团队和证书后归档上传。

## 本地生成 Xcode 工程

仓库已包含可直接编译的离线网页资源。生成 Xcode 工程需要 Xcode 和 XcodeGen：

```bash
bash native/scripts/generate-icons.sh
cd native && xcodegen generate
```

随后用 Xcode 打开 `native/JyutpingAI.xcodeproj`。

如需修改界面并重新生成离线网页资源：

```bash
cd native/Web
npm install
npm run build
```

## 网页版

```bash
pnpm install
pnpm run dev
```
