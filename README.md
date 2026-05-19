# About
早先自己用react实现了一个网页前端版的english geeks。当前这个尝试用cursor从头开始这个项目，目标是做成一个交互式网页版的英语填空练习的app，从头在ai的帮助下一步步完成。未来将会作为微信公众号推文的完整功能链接。也是网络示范直播的演示界面，以及视频制作的基本素材。


I want to build an interactive webpage，with a title named "English Geeks" and a subtitle "英语极客“。这个页面用来学习一个较短的英语段落。这个段落可能是一段发言的文本，也可能是一段对话。它的每一句将被分拆开来，让用户一句一句地学习。总的句子数量控制在10-20句，以便让用户能够在30-45分钟内学习完。这个练习页面将是个网页，可以用浏览器打开后使用，尽量全部使用前端编辑来实现。

我会提供一段视频或录音，你帮我想办法如何获取它的英文caption。然后caption的全文需要被一句句拆开，并逐句编号，而句子中的每个词也要编号（前一部分为所在句子的编号，后一部分所该词在句子中的顺序号）。其原始音频或视频按对应的每句英文进行切割并按对应的句子给予相同的编号。你还要将每句英文译成中文，这个中文句子也与原始英句拥有相同的编号。你还要针对句子中每个词提供它的IPA标注，每个IPA拥有对应词的编号。
我会对每一句的英原文作blank out处理，分为三个级别，处理后的每句文本拥有与原句相同的编号。

练习流程如下面所述，每一步的练习内容都单独出现在页面上，并按下面的先后顺序自上而下出现在页面上。用户可以按这个顺序自上而下一步步地学习，也可以省略一些步骤，直接跳到想学习的位置：

第一步、 学习生词：在页面的开始位置先展示一些生词，标出它们的音标（旁边有个播放图标，点击后可以播放读音），以及中英文释义，最后一条释文应该指出它在本文中的意思。这些生词来自待学习的文本，它们可以由人工事先挑选出来，也可以由AI根据对单词难度的评估，挑出最难的5-10个单词。单词的音标以及中英文释义应由AI自动生成并放在单词的后面。“点击播放读音“这个功能如何实现请在后面提出你的建议。

第二步、 初次倾听：页面接下来有一个显著的音频播放键，点击后播放这段文字的语音，它可以是原始录音，也可以是AI生成的。建议只听一遍。它的目的是为了测试学习效果，即在填空练习全部完成后，最后再播一下，以体会学习的效果。

第三步、下面开始填空练习，这是最重要的核心部分： 
下面是一个较大的区间，它由三个相同的文本区叠加在一起，分别是初、中、高三个级别的填空练习区。叠加区的上面有三个tab，分别标记为Begginer/Intermidate/Advanced，用户点击某个tab，则显示相应级别的练习区。对于触摸屏设备，或者支持鼠标的设备，用户可以通过左右滑动swipe来改变级别。

每个练习区在形式上是相同的，除了里面分别放有不同级别的blank-out文本。级别越高，被blank的空白越多。
每个区每次只显示一句blankout英文（自动回行）及其相应的IPA、中译文（根据编号进行匹配和对位），IPA放在对应词的上方，而此句的中译文则在文本区内的最上方（自动回行）。每个词都可以点击，包括被bloukout的词，点击后弹出一个临时文本框，显示该词的简短英中释义。
练习区文本框的上下边缘均有一个上一句/下一句的button，用户点击则显示上一句/下一句bloukout文本及其IPA和中译文。这两个button在形状上还可以提示用户可以通过向下和向上的swipe来move到上一句/下一句的相关内容。

每个练习区的下面有三个button，它们分别是：1、【Full Text】，按下后显示当前句子的全文，即被blankout的原始字母全部显示出来；松开后恢复原样；2、【Show Trans.】click可以toggle显示译文；3、【Show IPA】click可以toggle显示IPA。

用户可以采用两种练习方式：
A.用户通常会以默读或轻读的方式念出全句，包括正确猜出bloukout的词。当然，这种练习在每个句子上并没有什么交互动作，用户自己判断对错并控制节奏。
B.进一步，我们还设有一个重要的【Speak】button，它允许用户通过朗读的方式来填空。用户点击它后，获得麦克风权限，然后用户可以从头开始朗读整个句子，包括猜出被blankout的词。他也可以只读其中的某一段。朗读时出现较长停顿时，被认为他读了一次，并依此进行语音识别，识别完成后依据最大区配长度算法，计算出原文句子中哪些词被正确读出，并将匹配的词变为绿色，包括bloukout的词。bloukout的词如果匹配，则在原处显示它的原文。同时该句子的上方弹出一个文本框，实时显示被识别的文本，以便用户观察自己在哪里读错了。在读下句之前，上次被识别的文本一直保留，而开始读了下句之后则该框清空、实时显示这一次的识别文本。【Speak】button由于比较特殊，想听听你的建议放在哪里。

4 最后再播放一遍原始语音，或者视频，以体验练习效果。



================================
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
