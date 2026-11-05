# 打包与本地安装(签名 CRX)

Chrome 137+ 禁用了 `--load-extension` 命令行加载,给本机用户安装本地扩展的正路是:

## 方式一:UI 加载未打包(开发者模式)
chrome://extensions → 开发者模式 → 加载未打包的扩展程序 → 选仓库根目录

## 方式二:签名 CRX + External Extensions(免 UI,自动安装)

```bash
# 1. 生成私钥(PKCS#1)并转 PKCS#8(Chrome 打包要求 PKCS#8 PEM)
openssl genrsa 2048 > study-mode.pem
openssl pkcs8 -topk8 -nocrypt -in study-mode.pem -out study-mode-pk8.pem

# 2. 打包 crx3(用已有 key 保持扩展 ID 稳定)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --pack-extension=/path/to/study-mode \
  --pack-extension-key=packaging/study-mode-pk8.pem
# 生成 study-mode.crx

# 3. 计算扩展 ID:扩展ID = SHA256(公钥DER)[0:32] 的 hex 映射到 a-p
openssl rsa -in study-mode.pem -pubout -outform DER -out pub.der
python3 -c "
import hashlib
h = hashlib.sha256(open('pub.der','rb').read()).hexdigest()[:32]
print(''.join(chr(ord('a')+int(c,16)) for c in h))
"

# 4. 写外部扩展配置(macOS)
cat > ~/Library/Application\ Support/Google/Chrome/External\ Extensions/<扩展ID>.json << 'JSON'
{
  "external_crx": "/absolute/path/to/study-mode.crx",
  "external_version": "1.1.0"
}
JSON

# 5. 完全退出 Chrome(Cmd+Q,确保进程消失)再启动 → 自动安装
#    ⚠️ 首次安装后扩展可能处于"待用户确认"状态,需要到 chrome://extensions 手动开启一次
```

## 当前机器的凭据
- 私钥:study-mode.pem / study-mode-pk8.pem(勿丢,丢了扩展 ID 会变)
- 当前扩展 ID:dobeladphbknijbajolipahjodligioo
- crx:study-mode-v1.1.0.crx(装在 ~/Downloads 的那份是被 External Extensions 引用的,不能删)
