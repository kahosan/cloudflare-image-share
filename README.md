# Cloudflare Image Share
基于 Cloudflare Pages + R2 实现的私有图片分享(图床)网站。

![image](https://t.mx1700.com/file/StRCFKTWynky.jpeg)

## 特性
- [X] 支持 Cloudflare R2 存储
- [X] 密码保护，开启后有密码才能上传和管理
- [X] github 部署
- [X] ctrl+v 上传图片
- [X] 图片压缩
- [X] 文件管理：浏览、排序、复制链接（URL / Markdown / HTML / BBCode）、单个和批量删除
- [X] 服务端校验：只接受真实的图片文件（JPG / PNG / GIF / WebP / AVIF），并限制文件大小
- [ ] 增加暗色模式
- [ ] 视频文件支持
- [ ] 多文件上传
- [ ] S3 后端支持

> telegraph 已经停止图片上传服务，对应的存储后端已被移除，请使用 Cloudflare R2。
> Cloudflare R2 免费空间 10GB，可以在「管理」页面手动删除图片。

## 如何部署
1. fork 项目，在 Cloudflare Pages 创建新项目，选择 GitHub 作为代码仓库。
2. 在“设置构建和部署”页选择“框架预设”为“Next.js”，点击“保存并部署”。
![image](https://t.mx1700.com/file/203qsPwjltsq.jpeg)
3. 等待部署完成，点击“继续处理项目”进入项目主页 
现在访问项目会报错“Node.JS Compatibility Error”，因为还没设置“兼容性标志”
4. 在 cloudflare pages 项目的 “设置” 页选择左侧菜单函数，
然后找到“兼容性标志”部分，点击“配置生产兼容性标志”，内容填写```nodejs_compat```
![image](https://t.mx1700.com/file/UBwpyo6p3Diu.jpeg)
5. 继续在设置的函数菜单里设置 R2 桶绑定（如果没有桶，请先创建一个），变量名称必须是 ```R2_BUCKET```，
![image](https://t.mx1700.com/file/ZzkSAEyXZv65.png)
6. 重新部署，项目应该可以正常访问了。
![image](https://t.mx1700.com/file/G9Hl66ma73MZ.jpeg)

## 配置
支持的环境变量

注意：修改完环境变量后需要重新部署
```toml
PASSWORD = "123456"                 # 访问密码，不设则任何人都可以公开上传和管理（不推荐）
AUTH_SECRET = "a-long-random-string" # 登录凭证的签名密钥，强烈建议设置，见下方说明
STORAGE_PROVIDER = "r2"             # 图片存储方式，目前只支持 r2（默认）
MAX_IMAGE_SIZE = "20"               # 可上传的最大大小，单位 MB，默认 20 MB（服务端同样会校验）
ENABLE_IMAGE_COMPRESSION = "true"   # 是否开启图片压缩，默认开启
COMPRESSED_IMAGE_MAX_SIZE = "5"     # 超过该大小才会压缩，且压缩后不超过该大小，单位 MB，默认 5 MB
MAX_IMAGE_WIDTH_OR_HEIGHT = "2560"  # 图片压缩后的最大宽度或高度，默认 2560
```

**关于 AUTH_SECRET**：登录成功后会签发一个 7 天有效的凭证（JWT）。
- 设置了 `AUTH_SECRET` 后，凭证用它签名，凭证本身不包含任何可用于推算密码的信息；
- 没有设置时，会回退为用 `PASSWORD` 派生密钥，如果密码很弱，凭证有被离线破解的风险；
- 生成方式示例：`openssl rand -base64 32`；
- 更换 `AUTH_SECRET` 会让所有已登录的设备重新登录。

压缩只对超过 `COMPRESSED_IMAGE_MAX_SIZE` 的图片生效，GIF 不会被压缩（避免丢失动画）。
压缩后大小设置为 5 MB 时，建议宽高限制在 2560 像素。

使用 Cloudflare R2 时，需要配置 R2 存储桶绑定，
在 cloudflare pages 项目的 “设置” 页，
左侧菜单选择函数，然后在页面里找到 “R2 存储桶绑定”
填写变量名称 ```R2_BUCKET``` 和对应的存储桶，
然后点击 “保存”。

![image](https://t.mx1700.com/file/Oct63XBFQph5.jpeg)

## 文件管理
登录后点击右上角「管理」进入。
- 按最新 / 最早 / 体积最大排序，顶部显示文件总数和总占用空间；
- 每张图片可一键复制 URL、Markdown、HTML、BBCode；
- 支持单个删除和多选批量删除，删除前需要二次确认；
- 最多列出 5000 个文件。

**注意**：图片响应带有 `Cache-Control: immutable`，删除文件后，已经缓存过它的浏览器 / CDN 在缓存过期前仍可能显示旧图片。

## 技术栈
- Next.js
- Cloudflare Pages
- Cloudflare R2
- v0.dev

## 开发

复制 wrangler.toml.dev 文件为 wrangler.toml。

启动开发环境:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

访问 [http://localhost:3000](http://localhost:3000) 

## Next.js 部署到 Cloudflare 的兼容性问题

- Cloudflare 所有动态页面和 api 都必须使用 edge 环境
- next.js 的 server actions 为必须导出 async 函数

Cloudflare 运行在 edge 环境，必须在文件内增加 export const runtime = 'edge'，
而 next.js 编译器认为导出了一个同步函数（我认为这是 next.js bug），会导致部署失败，暂时无解，许等待 next.js 解决。

所以目前无法使用 server actions，只能使用 api 来做后端。

## TODO
- [ ] 尝试增加状态管理库 zustand