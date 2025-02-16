# Better xCloud
Improve [Xbox Cloud Gaming (xCloud)](https://www.xbox.com/play/) experience on web browser.  
The main target of this script is mobile users, but it should work great on desktop too.

Give this project a 🌟 if you like it. Thank you.

## Features

<img width="500" alt="Settings UI" src="https://github.com/redphx/better-xcloud/assets/96280/4f60c2e6-9706-4326-940f-f46998177633">  
<img width="500" alt="Video Settings UI" src="https://github.com/redphx/better-xcloud/assets/96280/130aa870-6938-4604-9e23-45e217b800cc">

- **Switch region of streaming server**  
  > Connect to another server instead of the default one. Check [FAQ section](#faq) for some notes.
- **Prefer IPv6 streaming server**
  > Might reduce latency
- **Force high quality stream**
  > Force xCloud to use the best streaming codec profile (same as desktop). You don't have to change User-Agent anymore.  
  > Some browsers (like Firefox) don't support this feature. Check [the full list](https://caniuse.com/?search=setCodecPreferences).  
  > If you're on Android and want to use it, try [Hermit](https://hermit.chimbori.com).
  > Check [User-Agent section](#user-agent) for a work-around.
- **Disable bandwidth checking**
  > xCloud won't reduce quality when the internet speed is slow
- **Skip Xbox splash video**
  > Save 3 seconds
- **Hide Dots icon while playing**
  > You can still click on it, but it doesn't block the screen anymore
- **Reduce UI animations**
  > Disable `transition` CSS property in some elements. The smooth scrolling cannot be disabled.
- **Stretch video to full sctreen**
  > Useful when you don't have a 16:9 screen
- **Adjust video filters**
  > Brightness/Contrast/Saturation
- **Disable social features**
  > Features like friends, chat... Disable these will make the page load faster.
- **Disable xCloud analytics**
  > The analytics contains statistics of your streaming session, so I'd recommend to allow analytics to help Xbox improve xCloud's experence in the future.
- **Hide footer and other UI elements**

## How to use
1. Install [Tampermonkey extension](https://www.tampermonkey.net/) on suppported browsers. It's also available for Firefox on Android.
2. Install **Better xCloud**:
    - [Stable version](https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js)
    - [Dev version](https://github.com/redphx/better-xcloud/raw/main/better-xcloud.user.js)  
4. Refresh [xCloud web page](https://www.xbox.com/play/).
5. Click on the new "SERVER NAME" button next to your profile picture to adjust settings.  
6. Don't forget to enable auto updating for the script in Tampermonkey.

To update manually, just install the script again (you won't lose your settings).

## Compatibility
✅ = confirmed to be working  
❓ = not yet tested  
❌ = not supported (mostly because of lacking Userscript/extension support)  
⚠️ = see custom notes  
|                                        | Desktop          | Android          | iOS             |
|----------------------------------------|------------------|------------------|-----------------|
| Chrome/Edge/Chromium variants          | ✅               | ❌               | ❌               |
| Firefox                                | ✅               | ✅               | ❌               |
| Safari                                 | ✅<sup>(1)</sup> | ❌               | ✅<sup>(2)</sup> |
| [Hermit](https://hermit.chimbori.com)  | ❌               | ⚠️<sup>(3)</sup> | ❌               |

Don't see your browser in the table? If it supports Tampermonkey/Userscript then the answer is likely **"YES"**.

<sup>1, 2</sup> Requires [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887).  
<sup>3</sup> NOT RECOMMENDED at the moment since its Userscript implementation is not working properly. Non-network related features (skip splash video, video settings...) still work. It's still my favorite app to play xCloud on because it's lightweight, supports Userscript (premium features, only $1.99) without having to install anything else. I built **Better xCloud** just so I could use it with Hermit.  

## FAQ
1. **Will I get banned for using this?**  
I think it's very unlikely that you'll get banned for using this. Most of the features only affect client-side, except for switching region of streaming server (you'll connect to another server instead of the default one). If you want to be safe just avoid using that. As always, use as your own risk.

2. **Why is it an Userscript and not extension?**  
It's because not many browsers on Android support installing extensions (and not all extensions can be installed).

3. **I see "???" button instead of server's name**  
That means Tampermonkey is not working properly. Please make sure you're using the latest version or switch to a well-known browser.  

4. **Can I use this with the Xbox Android app?**  
No you can't. You'll have to modify the app.

5. **Will you able to enable "Clarity Boost" feature on non-Edge browsers?**  
No. "Clarity Boost" feature uses an exclusive API (`Video.msVideoProcessing`) that's only available on Edge browser for desktop at the moment.

## User-Agent
You're no longer needed to change User-Agent since you can just use the **Force high quality stream** setting.  
If your browser doesn't support **Force high quality stream** setting, try changing User-Agent to:  
```
Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) 94.0.4606.31/7.0 TV Safari/537.36
```
This will change your device to a Samsung TV running Tizen OS. It will improve the stream quality.  

---
Change User-Agent to:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.67
```
This will trick xCloud into thinking you're using Edge browser on desktop.

Other options (only do one of these):
- Add ` smarttv` to switch to Smart TV layout.
- Add ` Xbox;` to become an Xbox console.
- Add ` 36102dd3-6953-45f6-8b48-031fb95e0e0d` to become a Logitech G Cloud device.
- Add ` 0ed22b6f-b61d-41eb-810a-a1ed586a550b` to become a Razer Edge device.

## Acknowledgements  
- [n-thumann/xbox-cloud-server-selector](https://github.com/n-thumann/xbox-cloud-server-selector) for the idea of IPv6 feature
- Icons by [Adam Design](https://www.iconfinder.com/iconsets/user-interface-outline-27)

## Disclaimers  
- Use as your own risk.  
- This project is not affiliated with Xbox in any way. All Xbox logos/icons/trademarks are copyright of their respective owners.
