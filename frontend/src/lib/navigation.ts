// ページを丸ごと読み直して移動する。ブラウザに残った表示データもまとめて捨てたいときに使う
export function reloadTo(path: string): void {
  window.location.assign(path);
}
