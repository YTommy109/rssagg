---
id: TASK-18
title: 重複排除の後段（埋め込み類似度と Jev）
status: To Do
assignee: []
created_date: '2026-10-18 13:13'
labels: []
dependencies:
  - TASK-5
  - TASK-6
priority: low
type: feature
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-5 は URL 正規化と本文ハッシュまでで、本文が少し違うだけの同じ話題は残る。ADR-0002 の後段（埋め込み類似度、微妙な組だけ Jev）で取りこぼしを減らす。TASK-5 の後で、実データの重複の残り方を見て要否を判断する。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 本文が違っても同じ話題の記事を、埋め込み類似度で重複の候補にできる（Vectorize はローカルで動かないためモックで代替する。ADR-0007）
- [ ] #2 類似度が微妙な組だけ Jev で同一かを判定し、同一なら 1 件にまとめる
- [ ] #3 しきい値を実データで調整し、誤ってまとめた例とまとめ損ねた例を docs に記録している
<!-- AC:END -->
