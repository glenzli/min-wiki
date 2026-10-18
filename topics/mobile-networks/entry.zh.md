<!-- wiki-learning:start -->

消息不是纸飞机，也没有连着两部手机的电线，它靠谁到达远方？

先逐步追踪编号 1。依次关掉本机接入、中间路径和对方接入，比较部分停在哪里；恢复连接后继续。移动本机时看下一个未发出的编号换到 A 还是 B，最后把送达与模拟打开分开。

## 无线接入后还有基础设施

基站收发无线电信号，把手机接入移动通信网络。天线可装在塔上、建筑上或较小站点。接入网络与后续网络不是同一段：回程可以使用光纤、电缆或无线链路，本图选择有线代表路线。家庭 Wi‑Fi 则先经过本地接入点，再进入家庭网络及互联网；接上本地接入点并不保证互联网服务可达。

## 编号是追踪信息的办法，不是飞行物

消息先表示为数字信息。图中三份只帮助读者追踪与拼接，不对应真实文本长度或固定协议格式。网络设备依照地址转发数据；通信栈中的分段、顺序恢复和应用消息拼接有不同责任。以 TCP 为例，它能向应用提供可靠的有序字节流，但并不自动代表收件人读过内容。其他传输协议和应用确认规则不同。

## 网络路径、等待和确认各有边界

图中“网络与服务”是对多个网络及可能的消息服务的合并表示；并非所有通信都经过同一台服务器。SMS、联网聊天、通话及不同应用的路径和确认方式可能不同。模型中关闭某段只会阻塞该段尚未完成的传送，保留已走过的部分；恢复后可继续。实际网络可能重传、绕路、暂存或失败，本图不计算这些协议、无线强度或真实时延。图中送达由俯看两端的观察者统计，不模拟返回给发送方的确认消息。

## 容易误解的地方

手机通常不是直接把聊天内容无线送到另一部远方手机；“无线”描述其中的接入段，不代表整条路线都没有电缆。

## 模型边界

这是本地的代表性联网聊天示意，不发真实消息。三枚编号、六段路线、先后顺序和步数用于教学，时间、尺寸和距离未标定；中间路径无备用路线。未模拟丢包、重传、切换信令或加密，不能据图判断隐私安全。

## 资料来源

- [UKHSA · Mobile phone base stations: mobile network technology](https://www.gov.uk/government/publications/mobile-phone-base-stations-radio-waves-and-health/mobile-phone-base-stations-radio-waves-and-health)
- [Internet Society · Solutions for Traffic Backhaul in Community Networks](https://www.internetsociety.org/wp-content/uploads/2020/01/Backhaul-Solutions-Fact-Sheet-shortversion.pdf)
- [Internet Society · Routing Security for Policymakers (routing definitions and architecture)](https://www.internetsociety.org/resources/doc/2018/routing-security-for-policymakers/)
- [IETF RFC 9293 · Transmission Control Protocol, section 2.2](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2)
- [Cisco · Wireless Access Point: objective and network setup](https://www.cisco.com/c/en/us/support/docs/smb/wireless/cisco-small-business-100-series-wireless-access-points/smb5530-set-up-a-wireless-network-using-a-wireless-access-point-wap.html)

## 讲给孩子听 {#narration}

[下载纯口播稿](narration.zh.txt?download) · [下载分镜稿](narration.zh.storyboard.txt?download)

### 远方的屏幕为什么会亮

我们想把“公园见”告诉远方的朋友。手机不能把声音喊得那么远，也没有一根线直接连着朋友的手机。它把消息表示成数字信息，交给身边的连接，再沿着网络走。画里把信息分成三个带编号的部分，方便我们追踪。它们不是三颗真的会飞的小球。

*画面提示: 从三个本机编号开始，指出两端手机与中间基站。*

### 天线后面还有一条路

先跟着第一个编号走。手机用看不见的无线电信号连接基站。看，到了基站还没到朋友那里呢！基站连着更大的网络。我们这幅图用绿色线表示电缆和光纤，再经过网络与消息服务，进入朋友那边的网络。设备帮助信息找到下一段路，文字不会自己认路。

*画面提示: 逐步推进编号 1，比较无线接入的金色虚线和有线网络的绿色线。*

### 断掉一段会怎样

假如朋友的手机暂时没有连接，最后一段就过不去。信息在图中等待，收件区还没有拼齐，不能说已经送到了。现在把连接恢复，再让旅程继续。你也可以比较本机离线和中间路径不通，它们会停在不同地方。真实服务有时能等一等，有时也会告诉你发送失败。

*画面提示: 重置后关闭对方连接，推进到第五步；恢复后继续。再单独比较本机与网络断点。*

### 送到了，也要等人打开

三个编号都到了，手机能把整条消息显示出来。不过手机收到，不等于朋友已经看过。对方打开消息是另一件事。在真实生活里，不同应用的记号可能不同。发消息前，可以请大人一起确认收件人；住址、密码和私人照片不要发给陌生人。图里的小实验不需要你填任何私人消息。

*画面提示: 推进到十八步，先观察送达状态，再模拟对方打开；最后比较已读与未读。*

<!-- wiki-learning:end -->
