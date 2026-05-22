"""
spaCy-based sentence blanking (levels 1–5).
Used by the lesson build pipeline: level 2 → beginner, 4 → intermediate, 5 → advanced.
"""


def blank_out_designated_words(sentence, level, nlp):  # token_container is a sentence, return blanked sentence
    # print("blank_level=", blank_level)
    # 在blankout之前，需要转成nlp对象：
    blanked_sentence = ""

    blank_level = str(level)

    # place the index of 'sents' to the beginning:
    nlp_sents = nlp(sentence).sents  # 原文的一句（实际上是一行）经nlp还是看成多个句子。
    new_text = ""
    for sent in nlp_sents:
        for token in sent:  # 打印指定类型的token
            if token.dep_ in ["nsubj", "nsubjpass", "csubj", "csubjpass", "pobj", "dobj", "iobj", "ROOT"]:
                # print(token.text, token.pos_, token.dep_)
                # print(token.text,end=" ")
                pass
            elif token.pos_ != "PUNCT" and token.pos_ != "SPACE":
                # print("_",end=" ")
                pass
        text_to_print = ""
        for token in sent:
            # print("token:",token.text,"pos:",token.pos_,"idx:",token.idx,"text:",text)
            if token.pos_ == "SPACE":  # if it is a space, print a new line space代表一个空行，不是空格。
                continue
            # 保留主谓宾及名词，其余：长度为1，换为_; <=3,保留首字母；4< <=6：保留首字母和尾字母; >6:保留2首字母和2尾字母
            if blank_level == "1":
                if token.pos_ == "PROPN" or token.pos_ == "PRON" or token.pos_ == "NOUN" or token.pos_ == "PUNCT" or token.pos_ == "VERB":
                    text_to_print = token.text
                else:
                    if len(token.text) == 1:
                        text_to_print = "_"
                    elif len(token.text) <= 3:
                        text_to_print = token.text[0] + "_" * (len(token.text) - 1)
                    elif 4 < len(token.text) <= 6:
                        text_to_print = token.text[0] + "_" * (len(token.text) - 2) + token.text[len(token.text) - 1]
                    else:
                        text_to_print = token.text[0] + token.text[1] + "_" * (len(token.text) - 4) + token.text[len(token.text) - 2] + token.text[len(token.text) - 1]
                # new_text += text_to_print + token.whitespace_
                # print("new_text=",new_text)
            # 保留主谓宾及名词，其余：长度为1，换为_; <=4,保留首字母；>4：保留首字母和尾字母
            if blank_level == "2":
                if token.pos_ == "PROPN" or token.pos_ == "PRON" or token.pos_ == "NOUN" or token.pos_ == "PUNCT" or token.pos_ == "VERB":
                    text_to_print = token.text
                else:
                    if len(token.text) == 1:
                        text_to_print = "_"
                    elif len(token.text) <= 4:
                        text_to_print = token.text[0] + "_" * (len(token.text) - 1)
                    else:
                        text_to_print = token.text[0] + "_" * (len(token.text) - 2) + token.text[len(token.text) - 1]
                # new_text += text_to_print + token.whitespace_
            # 保留主宾及名词，动词留词根或原型；其余：长度为1，换为_; <=6,保留首字母；>6：保留首字母和尾字母
            if blank_level == "3":
                if token.pos_ == "PROPN" or token.pos_ == "PRON" or token.pos_ == "NOUN" or token.pos_ == "PUNCT":
                    text_to_print = token.text
                elif token.pos_ == "VERB":
                    text_to_print = token.lemma_ + "~"
                else:
                    if len(token.text) == 1:
                        text_to_print = "_"
                    elif len(token.text) <= 6:
                        text_to_print = token.text[0] + "_" * (len(token.text) - 1)
                    else:
                        text_to_print = token.text[0] + "_" * (len(token.text) - 2) + token.text[len(token.text) - 1]
                # new_text += text_to_print + token.whitespace_
            # 保留主宾，动词留词根或原型；其余：长度为1，换为_; 其它保留首字母
            if blank_level == "4":
                if token.pos_ == "PROPN" or token.pos_ == "PRON" or token.pos_ == "PUNCT" or token.dep_ == "dobj":
                    text_to_print = token.text
                elif token.pos_ == "VERB":
                    text_to_print = token.lemma_ + "~"
                else:
                    if len(token.text) == 1:
                        text_to_print = "_"
                    else:
                        text_to_print = token.text[0] + "_" * (len(token.text) - 1)
                # new_text += text_to_print + token.whitespace_
            # 保留主宾，其余：全部字母换为_
            if blank_level == "5":  #
                if token.pos_ == "PROPN" or token.pos_ == "PUNCT" or token.dep_ == "dobj" or token.dep_ == "pobj":
                    text_to_print = token.text
                elif token.pos_ == "VERB" or token.pos_ == "NOUN" or token.pos_ == "PRON" or token.pos_ == "CCONJ" or token.pos_ == "SCONJ":
                    text_to_print = token.text[0] + "_" * (len(token.text) - 1)
                else:
                    text_to_print = "_" * len(token.text)
            new_text += text_to_print + token.whitespace_
    return new_text
